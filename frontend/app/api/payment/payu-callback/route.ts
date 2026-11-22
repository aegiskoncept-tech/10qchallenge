import { NextRequest, NextResponse } from 'next/server';
import { PayUService } from '@/lib/commerce/payu';
import { OrderService } from '@/lib/commerce/order-service';
import { getCommerceDb } from '@/lib/commerce/db';

export async function POST(req: NextRequest) {
  try {
    // 1. Parse incoming Form Data from PayU
    const formData = await req.formData();
    const payload: Record<string, string> = {};
    formData.forEach((value, key) => {
      payload[key] = String(value);
    });

    const txnid = payload.txnid;
    const orderId = payload.udf2;
    const paymentAttemptId = payload.udf1;
    const mihpayid = payload.mihpayid || `PAYU_${Date.now()}`;
    const status = payload.status;
    const amountStr = payload.amount;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (!orderId || !paymentAttemptId || !txnid) {
      console.error('[PayU Callback] Missing correlation parameters:', { orderId, paymentAttemptId, txnid });
      return NextResponse.redirect(`${appUrl}/payment-failure?reason=MISSING_CORRELATION_KEYS`, { status: 303 });
    }

    // 2. Retrieve Order and Attempt from Database
    const order = await OrderService.getOrderById(orderId);
    if (!order) {
      console.error('[PayU Callback] Order not found in database:', orderId);
      return NextResponse.redirect(`${appUrl}/payment-failure?reason=ORDER_NOT_FOUND`, { status: 303 });
    }

    const attempt = await OrderService.getAttemptById(paymentAttemptId);
    if (!attempt) {
      console.error('[PayU Callback] Payment attempt not found in database:', paymentAttemptId);
      return NextResponse.redirect(`${appUrl}/payment-failure?reason=ATTEMPT_NOT_FOUND`, { status: 303 });
    }

    // 3. Authoritative Server-to-Server Verification (verify_payment + Hash + Correlation)
    const expectedOrder = {
      id: order.id,
      netPayableAmountPaise: Math.round(order.netPayableAmount * 100),
    };
    const expectedAttempt = {
      id: attempt.id,
      attemptedAmountPaise: Math.round(attempt.attemptedAmount * 100),
    };

    const verification = await PayUService.verifyCallbackEndToEnd(payload, expectedOrder, expectedAttempt);

    if (!verification.isValid) {
      console.error('[PayU Callback Authoritative Verification FAILED]:', PayUService.sanitizeForLog(verification));
      const db = await getCommerceDb();
      await db.query(
        `INSERT INTO commerce.payment_anomalies (order_id, payment_attempt_id, anomaly_type, severity, raw_payload)
         VALUES ($1, $2, $3, 'CRITICAL', $4);`,
        [order.id, attempt.id, verification.errorCode || 'VERIFICATION_FAILED', JSON.stringify(PayUService.sanitizeForLog(payload))]
      );

      // Update attempt status to FAILED
      await OrderService.updateAttemptStatus(attempt.id, 'FAILED', PayUService.sanitizeForLog(payload));

      return NextResponse.redirect(
        `${appUrl}/payment-failure?reason=${verification.errorCode || 'VERIFICATION_FAILED'}&orderId=${order.orderNumber}`,
        { status: 303 }
      );
    }

    // 4. Authoritative Database Settlement Execution (Idempotent)
    const verifiedAmount = (verification.verifiedAmountPaise! / 100);
    const gatewayPaymentId = verification.gatewayPaymentId!;

    const settlementResult = await OrderService.settlePayment({
      orderId: order.id,
      paymentAttemptId: attempt.id,
      gatewayPaymentId,
      verifiedAmount,
      rawPayload: { callback: payload, verification: verification.rawVerification },
    });

    if (!settlementResult.success) {
      console.error('[PayU Callback] Settlement rejected by database:', settlementResult);
      return NextResponse.redirect(
        `${appUrl}/payment-failure?reason=${settlementResult.statusCode}&orderId=${order.orderNumber}`,
        { status: 303 }
      );
    }

    // 5. Redirect to Payment Success
    return NextResponse.redirect(
      `${appUrl}/payment-success?orderId=${order.orderNumber}&txnId=${gatewayPaymentId}&amount=${order.netPayableAmount}&name=${encodeURIComponent(order.billingFullName)}`,
      { status: 303 }
    );
  } catch (error: any) {
    console.error('[PayU Callback Fatal Exception]', error);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${appUrl}/payment-failure?reason=SERVER_ERROR`, { status: 303 });
  }
}
