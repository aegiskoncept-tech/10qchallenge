// ==============================================================================
// 10Q CHALLENGE LMS — PHASE 4.2 MILESTONE 1 VERIFICATION GATE
// Comprehensive Test Suite covering all 11 required payment-flow scenarios,
// database persistence across restarts, and course purchasability rules.
// ==============================================================================

import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

async function runMilestone1GateTests() {
  console.log('================================================================');
  console.log('10Q CHALLENGE LMS — PHASE 4.2 MILESTONE 1 VERIFICATION GATE');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`[PASS] Test ${totalTests}: ${testName}`);
    } else {
      console.error(`[FAIL] Test ${totalTests}: ${testName}`);
      process.exitCode = 1;
    }
  }

  // Import Compiled Modules
  const { PricingEngine } = await import('../frontend/lib/commerce/dist/pricing.js');
  const { PayUService } = await import('../frontend/lib/commerce/dist/payu.js');
  const { PGlite } = await import('@electric-sql/pglite');

  const dataDir = path.join(projectRoot, 'database', 'pg_commerce_dev');
  let db = new PGlite(dataDir);

  const key = process.env.PAYU_MERCHANT_KEY || 'gtKFFx';
  const salt = process.env.PAYU_MERCHANT_SALT || '4R38IvwiV57FwVpsgOvTXBdLE4tHUXFW';

  function generateReverseHash(payload) {
    const {
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
      additionalCharges,
    } = payload;

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

    return crypto.createHash('sha512').update(calculatedSequence).digest('hex').toLowerCase();
  }

  // ----------------------------------------------------------------------------
  // GATE TEST 1: Course Purchasability & Expired Course Rejection
  // ----------------------------------------------------------------------------
  console.log('\n--- Gate 1: Course Master Purchasability & Expiry Enforcement ---');
  
  // Test Active Course with Future Validity
  const futureCourseMock = {
    id: 1001,
    title: 'Future Valid Course Batch',
    isActive: true,
    expiryDate: '2027-12-31',
  };
  const futurePurchasable = PricingEngine.isPurchasable(futureCourseMock);
  assert(futurePurchasable.purchasable === true, 'Active valid future-dated course is purchasable.');

  // Test Existing Course 1 with 2026-06-30 Expiry Date
  const course1 = PricingEngine.getAuthoritativeCourse('1');
  const course1Purchasable = PricingEngine.isPurchasable(course1);
  assert(
    course1Purchasable.purchasable === false && course1Purchasable.reason.includes('expired'),
    `Course 1 (Batch: ${course1.expiryDate}) correctly identified as expired on ${new Date().toISOString().split('T')[0]}.`
  );

  // Test Expired Course Mock
  const expiredCourseMock = {
    id: 999,
    title: 'Expired Past Course',
    isActive: true,
    expiryDate: '2023-01-01', // Explicitly in past
  };
  const expiredPurchasable = PricingEngine.isPurchasable(expiredCourseMock);
  assert(
    expiredPurchasable.purchasable === false && expiredPurchasable.reason.includes('expired'),
    'Expired course is strictly rejected with "This course batch validity has expired."'
  );

  // Test Inactive / Archived Course Mock
  const archivedCourseMock = {
    id: 998,
    title: 'Archived Course',
    isActive: false,
    expiryDate: '2027-01-01',
  };
  const archivedPurchasable = PricingEngine.isPurchasable(archivedCourseMock);
  assert(
    archivedPurchasable.purchasable === false && archivedPurchasable.reason.includes('archived'),
    'Archived/Inactive course is strictly rejected from new enrollment.'
  );

  // ----------------------------------------------------------------------------
  // GATE TEST 2: Database Restart & Persistence Across Sessions
  // ----------------------------------------------------------------------------
  console.log('\n--- Gate 2: Database Persistence Across Process Restarts ---');
  const persistenceMarkerId = crypto.randomUUID();
  const testMarkerNumber = `PERSIST-MARKER-${Date.now()}`;

  await db.query(
    `INSERT INTO commerce.orders (
      id, order_number, user_id, course_id, original_amount, discount_amount,
      net_payable_amount, billing_full_name, billing_email, billing_state_code, status
    ) VALUES (
      $1, $2, 9999, '1', 100.00, 0.00, 100.00, 'Persistence Tester', 'persist@test.com', 'KA', 'PENDING_PAYMENT'
    );`,
    [persistenceMarkerId, testMarkerNumber]
  );

  // Close database engine (simulating process exit)
  await db.close();

  // Re-open brand new instance pointing to same directory
  db = new PGlite(dataDir);
  const persistedRow = await db.query('SELECT * FROM commerce.orders WHERE id = $1;', [persistenceMarkerId]);
  assert(
    persistedRow.rows.length === 1 && persistedRow.rows[0].order_number === testMarkerNumber,
    'PostgreSQL 16 data cluster verified persistent across process restart.'
  );

  // Clean up marker
  await db.query('DELETE FROM commerce.orders WHERE id = $1;', [persistenceMarkerId]);

  // ----------------------------------------------------------------------------
  // GATE TEST 3: Successful PayU Sandbox Verification & Authoritative Settlement
  // ----------------------------------------------------------------------------
  console.log('\n--- Gate 3: Successful PayU Sandbox Verification & Settlement ---');
  const orderId = crypto.randomUUID();
  const attemptId = crypto.randomUUID();
  const txnId = `TXN_GATE_${Date.now()}`;
  const amountStr = '4999.00';
  const amountPaise = 499900;
  const testStudentUserId = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);

  await db.query(
    `INSERT INTO commerce.orders (
      id, order_number, user_id, course_id, original_amount, discount_amount,
      net_payable_amount, billing_full_name, billing_email, billing_state_code, status
    ) VALUES (
      $1, $2, $3, '1', 4999.00, 0.00, 4999.00, 'Gate Student', 'gate@test.com', 'MH', 'PENDING_PAYMENT'
    );`,
    [orderId, `ORD-GATE-${Date.now()}`, testStudentUserId]
  );

  await db.query(
    `INSERT INTO commerce.payment_attempts (
      id, order_id, merchant_txn_id, attempted_amount, currency, gateway_name, status
    ) VALUES (
      $1, $2, $3, 4999.00, 'INR', 'PAYU', 'SUBMITTED_TO_GATEWAY'
    );`,
    [attemptId, orderId, txnId]
  );

  // Mock PayU server-to-server verify_payment returning SUCCESS
  PayUService.setMockVerifyPayment(async (tid) => {
    if (tid === txnId) {
      return {
        status: 'success',
        txnid: tid,
        mihpayid: 'MIHPAY_SUCCESS_9001',
        amt: amountStr,
        udf1: attemptId,
        udf2: orderId,
        addedon: new Date().toISOString(),
      };
    }
    return null;
  });

  const validCallbackPayload = {
    key,
    txnid: txnId,
    amount: amountStr,
    productinfo: 'BITSAT Master',
    firstname: 'Gate',
    email: 'gate@test.com',
    status: 'success',
    udf1: attemptId,
    udf2: orderId,
    mihpayid: 'MIHPAY_SUCCESS_9001',
  };
  validCallbackPayload.hash = generateReverseHash(validCallbackPayload);

  const verificationResult = await PayUService.verifyCallbackEndToEnd(
    validCallbackPayload,
    { id: orderId, netPayableAmountPaise: amountPaise },
    { id: attemptId, attemptedAmountPaise: amountPaise }
  );

  assert(verificationResult.isValid === true, 'End-to-end PayU verification succeeded.');

  // Settle in Database
  const settleRes = await db.query(
    `SELECT success, status_code, payment_id, anomaly_id 
     FROM commerce.settle_payment_authoritative($1, $2, $3, 4999.00, NOW(), '{"verified":true}'::jsonb);`,
    [orderId, attemptId, verificationResult.gatewayPaymentId]
  );
  assert(settleRes.rows[0].success === true, 'Database payment settlement executed successfully.');

  const enrollmentCheck = await db.query(
    'SELECT * FROM commerce.enrollments WHERE order_id = $1 AND settlement_status = $2;',
    [orderId, 'SETTLED']
  );
  assert(enrollmentCheck.rows.length === 1, 'Student course enrollment provisioned with settlement_status = SETTLED.');

  // ----------------------------------------------------------------------------
  // GATE TEST 4: Duplicate Callback Idempotency
  // ----------------------------------------------------------------------------
  console.log('\n--- Gate 4: Duplicate Callback Idempotency ---');
  const dupSettle = await db.query(
    `SELECT success, status_code, payment_id, anomaly_id 
     FROM commerce.settle_payment_authoritative($1, $2, $3, 4999.00, NOW(), '{"duplicate":true}'::jsonb);`,
    [orderId, attemptId, verificationResult.gatewayPaymentId]
  );
  assert(dupSettle.rows[0].status_code === 'ALREADY_SETTLED_IDEMPOTENT', 'Duplicate callback returned ALREADY_SETTLED_IDEMPOTENT.');

  const paymentCountCheck = await db.query('SELECT COUNT(*) as count FROM commerce.payments WHERE order_id = $1;', [orderId]);
  assert(Number(paymentCountCheck.rows[0].count) === 1, 'Zero duplicate payment rows created on duplicate callback.');

  // ----------------------------------------------------------------------------
  // GATE TEST 5: Failed Gateway Payment Handling
  // ----------------------------------------------------------------------------
  console.log('\n--- Gate 5: Failed Payment Handling ---');
  const failTxnId = `TXN_FAIL_${Date.now()}`;
  PayUService.setMockVerifyPayment(async () => ({
    status: 'failure',
    txnid: failTxnId,
    mihpayid: 'MIHPAY_FAIL_001',
    amt: amountStr,
    udf1: attemptId,
    udf2: orderId,
  }));

  const failedPayload = {
    ...validCallbackPayload,
    txnid: failTxnId,
    status: 'failure',
  };
  failedPayload.hash = generateReverseHash(failedPayload);

  const failVerify = await PayUService.verifyCallbackEndToEnd(
    failedPayload,
    { id: orderId, netPayableAmountPaise: amountPaise },
    { id: attemptId, attemptedAmountPaise: amountPaise }
  );
  assert(failVerify.isValid === false && failVerify.errorCode === 'GATEWAY_NON_SUCCESS', 'Failed gateway status safely rejected without settlement.');

  // ----------------------------------------------------------------------------
  // GATE TEST 6: Pending Gateway Payment Handling
  // ----------------------------------------------------------------------------
  console.log('\n--- Gate 6: Pending Payment Handling ---');
  const pendTxnId = `TXN_PEND_${Date.now()}`;
  PayUService.setMockVerifyPayment(async () => ({
    status: 'pending',
    txnid: pendTxnId,
    mihpayid: 'MIHPAY_PEND_001',
    amt: amountStr,
    udf1: attemptId,
    udf2: orderId,
  }));

  const pendingPayload = {
    ...validCallbackPayload,
    txnid: pendTxnId,
    status: 'pending',
  };
  pendingPayload.hash = generateReverseHash(pendingPayload);

  const pendVerify = await PayUService.verifyCallbackEndToEnd(
    pendingPayload,
    { id: orderId, netPayableAmountPaise: amountPaise },
    { id: attemptId, attemptedAmountPaise: amountPaise }
  );
  assert(pendVerify.isValid === false && pendVerify.errorCode === 'GATEWAY_NON_SUCCESS', 'Pending gateway payment safely rejected from settlement.');

  // ----------------------------------------------------------------------------
  // GATE TEST 7: PayU Verification API Unavailable
  // ----------------------------------------------------------------------------
  console.log('\n--- Gate 7: Verification API Unavailable Handling ---');
  PayUService.setMockVerifyPayment(async () => null); // Simulates network failure / 500 error

  const unavailVerify = await PayUService.verifyCallbackEndToEnd(
    validCallbackPayload,
    { id: orderId, netPayableAmountPaise: amountPaise },
    { id: attemptId, attemptedAmountPaise: amountPaise }
  );
  assert(
    unavailVerify.isValid === false && unavailVerify.errorCode === 'POSTSERVICE_VERIFICATION_FAILED',
    'PostService unavailability safely blocks settlement without false positive approval.'
  );

  // ----------------------------------------------------------------------------
  // GATE TEST 8: Callback Hash Mismatch
  // ----------------------------------------------------------------------------
  console.log('\n--- Gate 8: Callback Hash Mismatch Handling ---');
  const badHashPayload = { ...validCallbackPayload, hash: 'bad00000000000000000000000000000' };
  const badHashVerify = await PayUService.verifyCallbackEndToEnd(
    badHashPayload,
    { id: orderId, netPayableAmountPaise: amountPaise },
    { id: attemptId, attemptedAmountPaise: amountPaise }
  );
  assert(
    badHashVerify.isValid === false && badHashVerify.errorCode === 'INVALID_CALLBACK_HASH',
    'Callback hash mismatch strictly caught and rejected.'
  );

  // ----------------------------------------------------------------------------
  // GATE TEST 9: Amount Mismatch Handling
  // ----------------------------------------------------------------------------
  console.log('\n--- Gate 9: Amount Mismatch Handling ---');
  PayUService.setMockVerifyPayment(async () => ({
    status: 'success',
    txnid: txnId,
    mihpayid: 'MIHPAY_AMOUNT_MISMATCH',
    amt: '1000.00', // Underpaid amount
    udf1: attemptId,
    udf2: orderId,
  }));

  const amountMismatchPayload = { ...validCallbackPayload, amount: '1000.00' };
  amountMismatchPayload.hash = generateReverseHash(amountMismatchPayload);

  const amountMismatchVerify = await PayUService.verifyCallbackEndToEnd(
    amountMismatchPayload,
    { id: orderId, netPayableAmountPaise: amountPaise }, // expects 499900 paise
    { id: attemptId, attemptedAmountPaise: amountPaise }
  );
  assert(
    amountMismatchVerify.isValid === false && amountMismatchVerify.errorCode === 'ORDER_AMOUNT_MISMATCH',
    'Underpaid / mismatched amount strictly caught before database settlement.'
  );

  // ----------------------------------------------------------------------------
  // GATE TEST 10: Transaction ID Mismatch Handling
  // ----------------------------------------------------------------------------
  console.log('\n--- Gate 10: Transaction ID Mismatch Handling ---');
  PayUService.setMockVerifyPayment(async () => ({
    status: 'success',
    txnid: 'DIFFERENT_TXN_ID',
    mihpayid: 'MIHPAY_TXN_MISMATCH',
    amt: amountStr,
    udf1: attemptId,
    udf2: orderId,
  }));

  const txnMismatchVerify = await PayUService.verifyCallbackEndToEnd(
    validCallbackPayload,
    { id: orderId, netPayableAmountPaise: amountPaise },
    { id: attemptId, attemptedAmountPaise: amountPaise }
  );
  assert(
    txnMismatchVerify.isValid === false && txnMismatchVerify.errorCode === 'TXNID_MISMATCH',
    'PostService txnid mismatch strictly caught and rejected.'
  );

  // ----------------------------------------------------------------------------
  // GATE TEST 11: Duplicate Payment Attempt Rejection
  // ----------------------------------------------------------------------------
  console.log('\n--- Gate 11: Duplicate Payment Attempt Rejection ---');
  let duplicateAttemptBlocked = false;
  try {
    // Attempting to insert an attempt with the exact same merchant_txn_id
    await db.query(
      `INSERT INTO commerce.payment_attempts (
        id, order_id, merchant_txn_id, attempted_amount, currency, gateway_name, status
      ) VALUES (
        $1, $2, $3, 4999.00, 'INR', 'PAYU', 'INITIATED'
      );`,
      [crypto.randomUUID(), orderId, txnId] // Same merchant_txn_id
    );
  } catch (err) {
    if (err.message.includes('unique') || err.message.includes('duplicate')) {
      duplicateAttemptBlocked = true;
    }
  }
  assert(duplicateAttemptBlocked === true, 'Duplicate payment attempt with same merchant_txn_id rejected by UNIQUE constraint.');

  console.log('\n================================================================');
  console.log(`MILESTONE 1 VERIFICATION GATE RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('================================================================\n');

  await db.close();

  if (passedTests !== totalTests) {
    process.exit(1);
  }
  process.exit(0);
}

runMilestone1GateTests().catch((err) => {
  console.error('Fatal Gate Verification Error:', err);
  process.exit(1);
});
