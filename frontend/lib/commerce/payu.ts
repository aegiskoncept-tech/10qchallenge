// ==============================================================================
// 10Q CHALLENGE LMS — PHASE 4.2 PAYU SANDBOX GATEWAY INTEGRATION
// Standard: Exact integer-paise arithmetic, server-to-server verify_payment,
// reverse SHA-512 hash validation, strict UDF cross-correlation.
// ==============================================================================

import * as crypto from 'node:crypto';
import { PricingEngine } from './pricing';
import { PayUInitiationParams } from './types';

export interface PayUVerificationResult {
  isValid: boolean;
  errorCode?: string;
  errorMessage?: string;
  gatewayPaymentId?: string; // mihpayid
  verifiedAmountPaise?: number;
  rawCallback?: any;
  rawVerification?: any;
}

export class PayUService {
  private static getKey(): string {
    return process.env.PAYU_MERCHANT_KEY || 'gtKFFx'; // Standard PayU Sandbox Test Key
  }

  private static getSalt(): string {
    return process.env.PAYU_MERCHANT_SALT || '4R38IvwiV57FwVpsgOvTXBdLE4tHUXFW'; // Active PayU Sandbox Test Salt
  }

  public static getPaymentUrl(): string {
    return process.env.PAYU_PAYMENT_URL || 'https://test.payu.in/_payment';
  }

  public static getPostServiceUrl(): string {
    return process.env.PAYU_POST_SERVICE_URL || 'https://test.payu.in/merchant/postservice.php?form=2';
  }

  /**
   * Generate SHA-512 Payment Initiation Hash
   * Formula: sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
   */
  public static generatePaymentHash(params: {
    txnid: string;
    amount: string; // e.g. "999.00"
    productinfo: string;
    firstname: string;
    email: string;
    udf1: string; // payment_attempt_id
    udf2: string; // order_id
    udf3?: string;
    udf4?: string;
    udf5?: string;
  }): string {
    const key = this.getKey();
    const salt = this.getSalt();
    const hashString = [
      key,
      params.txnid,
      params.amount,
      params.productinfo,
      params.firstname,
      params.email,
      params.udf1 || '',
      params.udf2 || '',
      params.udf3 || '',
      params.udf4 || '',
      params.udf5 || '',
      '', '', '', '', '', // udf6 - udf10 empty
      salt,
    ].join('|');

    return crypto.createHash('sha512').update(hashString).digest('hex').toLowerCase();
  }

  /**
   * Validate Reverse SHA-512 Hash on PayU Callback
   * Formula: sha512(SALT|status|udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
   * With additionalCharges: sha512(additionalCharges|SALT|status|...)
   */
  public static verifyCallbackHash(payload: Record<string, any>): boolean {
    const key = this.getKey();
    const salt = this.getSalt();

    const {
      hash,
      status = '',
      udf5 = '',
      udf4 = '',
      udf3 = '',
      udf2 = '',
      udf1 = '',
      email = '',
      firstname = '',
      productinfo = '',
      amount = '',
      txnid = '',
      key: receivedKey = '',
      additionalCharges,
    } = payload;

    if (!hash || receivedKey !== key) {
      return false;
    }

    const baseSequence = [
      salt,
      status,
      udf5,
      udf4,
      udf3,
      udf2,
      udf1,
      email,
      firstname,
      productinfo,
      amount,
      txnid,
      key,
    ].join('|');

    const calculatedSequence = additionalCharges
      ? `${additionalCharges}|${baseSequence}`
      : baseSequence;

    const calculatedHash = crypto.createHash('sha512').update(calculatedSequence).digest('hex').toLowerCase();
    return calculatedHash === String(hash).toLowerCase();
  }

  private static mockVerifyPaymentFn: ((txnid: string) => Promise<any | null>) | null = null;

  public static setMockVerifyPayment(fn: ((txnid: string) => Promise<any | null>) | null): void {
    this.mockVerifyPaymentFn = fn;
  }

  /**
   * Authoritative Server-to-Server verify_payment API Call to PayU PostService
   * Hash Formula: sha512(key|command|var1|salt)
   */
  public static async callVerifyPayment(txnid: string): Promise<any | null> {
    if (this.mockVerifyPaymentFn) {
      return await this.mockVerifyPaymentFn(txnid);
    }

    const key = this.getKey();
    const salt = this.getSalt();
    const command = 'verify_payment';

    const hashStr = `${key}|${command}|${txnid}|${salt}`;
    const hash = crypto.createHash('sha512').update(hashStr).digest('hex').toLowerCase();

    const formParams = new URLSearchParams();
    formParams.append('key', key);
    formParams.append('command', command);
    formParams.append('var1', txnid);
    formParams.append('hash', hash);

    try {
      const res = await fetch(this.getPostServiceUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formParams.toString(),
      });

      if (!res.ok) {
        throw new Error(`PayU PostService HTTP error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      if (data.status !== 1 || !data.transaction_details || !data.transaction_details[txnid]) {
        return null;
      }

      return data.transaction_details[txnid];
    } catch (err: any) {
      console.error('[PayU PostService verify_payment error]', err.message);
      return null;
    }
  }

  /**
   * Complete End-to-End Callback Verification Pipeline
   */
  public static async verifyCallbackEndToEnd(
    callbackPayload: Record<string, any>,
    expectedOrder: { id: string; netPayableAmountPaise: number },
    expectedAttempt: { id: string; attemptedAmountPaise: number }
  ): Promise<PayUVerificationResult> {
    // 1. Verify Reverse Hash
    if (!this.verifyCallbackHash(callbackPayload)) {
      return {
        isValid: false,
        errorCode: 'INVALID_CALLBACK_HASH',
        errorMessage: 'PayU callback reverse SHA-512 hash does not match.',
        rawCallback: callbackPayload,
      };
    }

    const txnid = callbackPayload.txnid;
    if (!txnid) {
      return {
        isValid: false,
        errorCode: 'MISSING_TXNID',
        errorMessage: 'PayU callback payload is missing txnid.',
        rawCallback: callbackPayload,
      };
    }

    // 2. Authoritative PostService Verification
    const verifyDetails = await this.callVerifyPayment(txnid);
    if (!verifyDetails) {
      return {
        isValid: false,
        errorCode: 'POSTSERVICE_VERIFICATION_FAILED',
        errorMessage: 'PayU PostService verify_payment did not return transaction details.',
        rawCallback: callbackPayload,
      };
    }

    // 3. Status checks
    if (verifyDetails.status !== 'success') {
      return {
        isValid: false,
        errorCode: 'GATEWAY_NON_SUCCESS',
        errorMessage: `PayU authoritative status is "${verifyDetails.status}".`,
        rawCallback: callbackPayload,
        rawVerification: verifyDetails,
      };
    }

    // 4. Cross-Verification of txnid and mihpayid
    if (verifyDetails.txnid !== txnid) {
      return {
        isValid: false,
        errorCode: 'TXNID_MISMATCH',
        errorMessage: `TxnId mismatch: Callback has "${txnid}" but PostService verified "${verifyDetails.txnid}".`,
        rawCallback: callbackPayload,
        rawVerification: verifyDetails,
      };
    }

    const mihpayid = String(verifyDetails.mihpayid || callbackPayload.mihpayid || '').trim();
    if (!mihpayid) {
      return {
        isValid: false,
        errorCode: 'MISSING_MIHPAYID',
        errorMessage: 'PayU payment ID (mihpayid) is missing.',
        rawCallback: callbackPayload,
        rawVerification: verifyDetails,
      };
    }

    // 5. Exact Integer-Paise Amount Validation
    const callbackPaise = PricingEngine.toPaise(callbackPayload.amount);
    const verifiedPaise = PricingEngine.toPaise(verifyDetails.amt);

    if (callbackPaise !== verifiedPaise) {
      return {
        isValid: false,
        errorCode: 'CALLBACK_VERIFIED_AMOUNT_MISMATCH',
        errorMessage: `Callback amount (${callbackPaise} paise) does not match PostService verified amount (${verifiedPaise} paise).`,
        rawCallback: callbackPayload,
        rawVerification: verifyDetails,
      };
    }

    if (verifiedPaise !== expectedOrder.netPayableAmountPaise) {
      return {
        isValid: false,
        errorCode: 'ORDER_AMOUNT_MISMATCH',
        errorMessage: `Verified amount (${verifiedPaise} paise) does not match expected order net payable (${expectedOrder.netPayableAmountPaise} paise).`,
        rawCallback: callbackPayload,
        rawVerification: verifyDetails,
      };
    }

    if (verifiedPaise !== expectedAttempt.attemptedAmountPaise) {
      return {
        isValid: false,
        errorCode: 'ATTEMPT_AMOUNT_MISMATCH',
        errorMessage: `Verified amount (${verifiedPaise} paise) does not match attempt amount (${expectedAttempt.attemptedAmountPaise} paise).`,
        rawCallback: callbackPayload,
        rawVerification: verifyDetails,
      };
    }

    // 6. UDF Correlation Validation
    const verifiedOrderId = String(verifyDetails.udf2 || '').trim();
    const verifiedAttemptId = String(verifyDetails.udf1 || '').trim();

    if (verifiedOrderId && verifiedOrderId !== expectedOrder.id) {
      return {
        isValid: false,
        errorCode: 'CORRELATION_ORDER_MISMATCH',
        errorMessage: `Verified udf2 orderId (${verifiedOrderId}) does not match expected orderId (${expectedOrder.id}).`,
        rawCallback: callbackPayload,
        rawVerification: verifyDetails,
      };
    }

    if (verifiedAttemptId && verifiedAttemptId !== expectedAttempt.id) {
      return {
        isValid: false,
        errorCode: 'CORRELATION_ATTEMPT_MISMATCH',
        errorMessage: `Verified udf1 attemptId (${verifiedAttemptId}) does not match expected attemptId (${expectedAttempt.id}).`,
        rawCallback: callbackPayload,
        rawVerification: verifyDetails,
      };
    }

    return {
      isValid: true,
      gatewayPaymentId: mihpayid,
      verifiedAmountPaise: verifiedPaise,
      rawCallback: callbackPayload,
      rawVerification: verifyDetails,
    };
  }
}
