// ==============================================================================
// 10Q CHALLENGE LMS — INITIATE REAL PAYU SANDBOX ORDER
// ==============================================================================

import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

async function initiateRealSandboxOrder() {
  const { PGlite } = await import('@electric-sql/pglite');
  const dataDir = path.join(projectRoot, 'database', 'pg_commerce_dev');
  const db = new PGlite(dataDir);

  const key = process.env.PAYU_MERCHANT_KEY || 'gtKFFx';
  const salt = process.env.PAYU_MERCHANT_SALT || '4R38IvwiV57FwVpsgOvTXBdLE4tHUXFW';

  const timestamp = Date.now();
  const orderId = crypto.randomUUID();
  const attemptId = crypto.randomUUID();
  const orderNumber = `10Q-REAL-${timestamp}`;
  const merchantTxnId = `10QTXN${timestamp}`;
  const amountStr = '4999.00';
  const amountPaise = 499900;
  const testStudentId = 9882;

  // Insert Order in PostgreSQL 16
  await db.query(
    `INSERT INTO commerce.orders (
      id, order_number, user_id, course_id, original_amount, discount_amount,
      net_payable_amount, billing_full_name, billing_email, billing_phone,
      billing_state_code, status
    ) VALUES (
      $1, $2, $3, '1', 4999.00, 0.00, 4999.00, 'Test Student', 'teststudent@10qchallenge.in',
      '9999999999', 'KA', 'PENDING_PAYMENT'
    );`,
    [orderId, orderNumber, testStudentId]
  );

  // Insert Payment Attempt in PostgreSQL 16
  await db.query(
    `INSERT INTO commerce.payment_attempts (
      id, order_id, merchant_txn_id, attempted_amount, currency, gateway_name, status
    ) VALUES (
      $1, $2, $3, 4999.00, 'INR', 'PAYU', 'INITIATED'
    );`,
    [attemptId, orderId, merchantTxnId]
  );

  // Generate Payment Initiation Hash
  const hashString = [
    key,
    merchantTxnId,
    amountStr,
    'BITSAT Master Crash Course',
    'Test',
    'teststudent@10qchallenge.in',
    attemptId,
    orderId,
    '', '', '', '', '', '', '', '',
    salt,
  ].join('|');

  const hash = crypto.createHash('sha512').update(hashString).digest('hex').toLowerCase();

  const payuParams = {
    key,
    txnid: merchantTxnId,
    amount: amountStr,
    productinfo: 'BITSAT Master Crash Course',
    firstname: 'Test',
    email: 'teststudent@10qchallenge.in',
    phone: '9999999999',
    surl: 'http://localhost:3000/api/payment/payu-callback',
    furl: 'http://localhost:3000/api/payment/payu-callback',
    hash,
    udf1: attemptId,
    udf2: orderId,
  };

  // Update attempt status
  await db.query(
    `UPDATE commerce.payment_attempts 
     SET raw_request = $1, status = 'SUBMITTED_TO_GATEWAY' 
     WHERE id = $2;`,
    [JSON.stringify(payuParams), attemptId]
  );

  await db.close();

  // Send Initiation Request to PayU Sandbox Gateway
  const res = await fetch('https://test.payu.in/_payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(payuParams).toString(),
    redirect: 'manual',
  });

  const location = res.headers.get('location');

  const sessionState = {
    orderId,
    orderNumber,
    attemptId,
    merchantTxnId,
    amountStr,
    amountPaise,
    payuCheckoutUrl: location,
    initiatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(projectRoot, 'database', 'active_sandbox_test.json'),
    JSON.stringify(sessionState, null, 2),
    'utf8'
  );

  console.log('=== REAL PAYU SANDBOX ORDER INITIATED ===');
  console.log(`Order ID: ${orderId}`);
  console.log(`Merchant Txn ID: ${merchantTxnId}`);
  console.log(`Amount: ₹${amountStr}`);
  console.log(`PayU Hosted Checkout URL: ${location}`);
  console.log('Saved to database/active_sandbox_test.json');
}

initiateRealSandboxOrder().catch(err => {
  console.error('Fatal Initiation Error:', err);
  process.exit(1);
});
