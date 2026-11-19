// ==============================================================================
// 10Q CHALLENGE LMS — PHASE 4.2 COMMERCE VERTICAL SLICE TEST SUITE
// Tests the full vertical flow: SQLite Auth + PostgreSQL 16 Commerce + PayU
// ==============================================================================

import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

async function runCommerceFlowTests() {
  console.log('================================================================');
  console.log('10Q CHALLENGE LMS — PHASE 4.2 VERTICAL SLICE VERIFICATION');
  console.log('Engine: Isolated PostgreSQL 16 + SQLite Identity Authority');
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

  // Setup isolated fixture directory for commerce flow tests
  const TEST_DIR = path.resolve(projectRoot, '.test-fixtures-commerce');
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }
  const testCourses = [
    {
      id: 1,
      title: 'BITSAT 2027 Master Crash Course (Active Batch)',
      slug: 'bitsat-2027-master-crash-course',
      originalPrice: '9999',
      discountedPrice: '4999',
      price: '4999',
      expiryDate: '2027-12-31',
      isActive: true,
      isShowInIndex: true,
    },
  ];
  fs.writeFileSync(path.join(TEST_DIR, 'courses.json'), JSON.stringify(testCourses, null, 2), 'utf-8');
  process.env.DATA_STORE_DIR = TEST_DIR;

  // 1. Initialize DBs
  const { PGlite } = await import('@electric-sql/pglite');
  const dataDir = path.join(projectRoot, 'database', 'pg_commerce_dev');
  const db = new PGlite(dataDir);

  // 2. Import Modules
  const { PricingEngine } = await import('../frontend/lib/commerce/dist/pricing.js');
  const { PayUService } = await import('../frontend/lib/commerce/dist/payu.js');

  // ----------------------------------------------------------------------------
  // TEST 1: PricingEngine - Authoritative Course Lookup & Tax-Inclusive Pricing
  // ----------------------------------------------------------------------------
  console.log('\n--- Step 1: Pricing Engine Verification ---');
  const course = PricingEngine.getAuthoritativeCourse('1'); // ID 1
  assert(course && course.title, 'Authoritative course ID 1 found in Course Master JSON.');
  
  const calculated = PricingEngine.calculatePrice('1');
  assert(calculated.isTaxInclusive === true, 'Course pricing is marked strictly tax-inclusive.');
  assert(calculated.netPayableAmountPaise > 0, `Net payable amount calculated: ₹${calculated.netPayableAmount} (${calculated.netPayableAmountPaise} paise).`);

  // ----------------------------------------------------------------------------
  // TEST 2: PayU Payment Initiation Hash Formula
  // ----------------------------------------------------------------------------
  console.log('\n--- Step 2: PayU Hash Formula Verification ---');
  const testTxn = '10QTXNTEST001';
  const testAmt = '999.00';
  const initHash = PayUService.generatePaymentHash({
    txnid: testTxn,
    amount: testAmt,
    productinfo: 'Test Course',
    firstname: 'Rahul',
    email: 'rahul@test.com',
    udf1: 'attempt-uuid-001',
    udf2: 'order-uuid-001',
  });
  assert(typeof initHash === 'string' && initHash.length === 128, 'Generated 128-char SHA-512 payment hash.');

  // ----------------------------------------------------------------------------
  // TEST 3: Reverse Callback Hash Verification
  // ----------------------------------------------------------------------------
  console.log('\n--- Step 3: PayU Reverse Callback Hash Verification ---');
  const key = process.env.PAYU_MERCHANT_KEY || 'gtKFFx';
  const salt = process.env.PAYU_MERCHANT_SALT || '4R38IvwiV57FwVpsgOvTXBdLE4tHUXFW';
  const callbackStatus = 'success';
  
  // Formula: sha512(SALT|status|udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
  const reverseStr = `${salt}|${callbackStatus}||||order-uuid-001|attempt-uuid-001|rahul@test.com|Rahul|Test Course|${testAmt}|${testTxn}|${key}`;
  const validReverseHash = crypto.createHash('sha512').update(reverseStr).digest('hex');

  const validPayload = {
    key,
    txnid: testTxn,
    amount: testAmt,
    productinfo: 'Test Course',
    firstname: 'Rahul',
    email: 'rahul@test.com',
    status: callbackStatus,
    udf1: 'attempt-uuid-001',
    udf2: 'order-uuid-001',
    hash: validReverseHash,
  };

  assert(PayUService.verifyCallbackHash(validPayload) === true, 'Reverse callback hash verified successfully.');

  const tamperedPayload = { ...validPayload, amount: '500.00' };
  assert(PayUService.verifyCallbackHash(tamperedPayload) === false, 'Tampered amount callback hash strictly rejected.');

  // ----------------------------------------------------------------------------
  // TEST 4: Database Settlement Flow on PostgreSQL 16
  // ----------------------------------------------------------------------------
  console.log('\n--- Step 4: PostgreSQL 16 Database Settlement Flow ---');

  // Insert test order
  const orderId = crypto.randomUUID();
  const attemptId = crypto.randomUUID();
  const testUserId = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000); // Fresh Student User ID

  await db.query(
    `INSERT INTO commerce.orders (
      id, order_number, user_id, course_id, original_amount, discount_amount,
      net_payable_amount, billing_full_name, billing_email, billing_state_code, status
    ) VALUES (
      $1, $2, $3, '1', $4, 0.00, $4, 'Rahul Sharma', 'rahul@test.com', 'KA', 'PENDING_PAYMENT'
    );`,
    [orderId, `ORD-${Date.now()}`, testUserId, calculated.netPayableAmount]
  );

  await db.query(
    `INSERT INTO commerce.payment_attempts (
      id, order_id, merchant_txn_id, attempted_amount, currency, gateway_name, status
    ) VALUES (
      $1, $2, $3, $4, 'INR', 'PAYU', 'SUBMITTED_TO_GATEWAY'
    );`,
    [attemptId, orderId, `TXN-${Date.now()}`, calculated.netPayableAmount]
  );

  // Invoke authoritative settlement stored procedure
  const settlementRes = await db.query(
    `SELECT success, status_code, payment_id, anomaly_id 
     FROM commerce.settle_payment_authoritative($1, $2, 'PAYU_MIH_99901', $3, NOW(), '{"gateway":"payu"}'::jsonb);`,
    [orderId, attemptId, calculated.netPayableAmount]
  );

  const row = settlementRes.rows[0];
  assert(row.success === true, `Settlement procedure returned SUCCESS: ${row.status_code}.`);
  assert(row.payment_id !== null, `Settled payment record created with ID: ${row.payment_id}.`);

  // Verify order updated to PAID
  const orderCheck = await db.query('SELECT status FROM commerce.orders WHERE id = $1;', [orderId]);
  assert(orderCheck.rows[0].status === 'PAID', 'Order status updated to PAID in PostgreSQL 16.');

  // Verify enrollment provisioned
  const enrollmentCheck = await db.query(
    'SELECT * FROM commerce.enrollments WHERE order_id = $1 AND settlement_status = $2;',
    [orderId, 'SETTLED']
  );
  assert(enrollmentCheck.rows.length === 1, 'Student course enrollment provisioned with settlement_status = SETTLED.');

  // ----------------------------------------------------------------------------
  // TEST 5: Duplicate Callback Idempotency
  // ----------------------------------------------------------------------------
  console.log('\n--- Step 5: Duplicate Callback Idempotency ---');
  const duplicateRes = await db.query(
    `SELECT success, status_code, payment_id, anomaly_id 
     FROM commerce.settle_payment_authoritative($1, $2, 'PAYU_MIH_99901', $3, NOW(), '{"gateway":"payu"}'::jsonb);`,
    [orderId, attemptId, calculated.netPayableAmount]
  );
  assert(
    duplicateRes.rows[0].success === true && duplicateRes.rows[0].status_code === 'ALREADY_SETTLED_IDEMPOTENT',
    'Duplicate callback returned ALREADY_SETTLED_IDEMPOTENT without creating duplicate rows.'
  );

  // Verify only 1 payment row exists
  const paymentCount = await db.query('SELECT COUNT(*) as count FROM commerce.payments WHERE order_id = $1;', [orderId]);
  assert(Number(paymentCount.rows[0].count) === 1, 'Exactly one payment row exists for the settled order.');

  // ----------------------------------------------------------------------------
  // TEST 6: Amount Mismatch & Durable Anomaly Recording
  // ----------------------------------------------------------------------------
  console.log('\n--- Step 6: Amount Mismatch Anomaly Recording ---');
  const mismatchOrderId = crypto.randomUUID();
  const mismatchAttemptId = crypto.randomUUID();

  await db.query(
    `INSERT INTO commerce.orders (
      id, order_number, user_id, course_id, original_amount, discount_amount,
      net_payable_amount, billing_full_name, billing_email, billing_state_code, status
    ) VALUES (
      $1, $2, 102, '1', 1000.00, 0.00, 1000.00, 'Underpay Test', 'underpay@test.com', 'DL', 'PENDING_PAYMENT'
    );`,
    [mismatchOrderId, `ORD-MISMATCH-${Date.now()}`]
  );

  await db.query(
    `INSERT INTO commerce.payment_attempts (
      id, order_id, merchant_txn_id, attempted_amount, currency, gateway_name, status
    ) VALUES (
      $1, $2, $3, 1000.00, 'INR', 'PAYU', 'SUBMITTED_TO_GATEWAY'
    );`,
    [mismatchAttemptId, mismatchOrderId, `TXN-MISMATCH-${Date.now()}`]
  );

  const mismatchRes = await db.query(
    `SELECT success, status_code, payment_id, anomaly_id 
     FROM commerce.settle_payment_authoritative($1, $2, 'PAYU_MIH_SHORT', 500.00, NOW(), '{"short":true}'::jsonb);`,
    [mismatchOrderId, mismatchAttemptId]
  );

  assert(mismatchRes.rows[0].success === false, 'Settlement with amount mismatch rejected.');
  assert(mismatchRes.rows[0].status_code === 'AMOUNT_MISMATCH', 'Status code indicates AMOUNT_MISMATCH.');
  
  const anomalyId = mismatchRes.rows[0].anomaly_id;
  assert(anomalyId !== null, `Durable anomaly record created with ID: ${anomalyId}.`);

  const anomalyRow = await db.query('SELECT * FROM commerce.payment_anomalies WHERE id = $1;', [anomalyId]);
  assert(anomalyRow.rows.length === 1 && anomalyRow.rows[0].anomaly_type === 'AMOUNT_MISMATCH', 'Anomaly row committed durably in database.');

  console.log('\n================================================================');
  console.log(`VERTICAL SLICE VERIFICATION COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('================================================================\n');

  await db.close();

  if (passedTests !== totalTests) {
    process.exit(1);
  }
  process.exit(0);
}

runCommerceFlowTests().catch(err => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});
