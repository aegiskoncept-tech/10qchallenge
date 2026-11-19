// ==============================================================================
// 10Q CHALLENGE LMS — PAYU SANDBOX CALLBACK LISTENER (PORT 3000)
// ==============================================================================

import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const PORT = 3000;
const key = process.env.PAYU_MERCHANT_KEY || 'gtKFFx';
const salt = process.env.PAYU_MERCHANT_SALT || '4R38IvwiV57FwVpsgOvTXBdLE4tHUXFW';

async function handlePayUCallback(req, res) {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {
      console.log('\n[Listener] Received callback from PayU:');
      const params = new URLSearchParams(body);
      const payload = {};
      for (const [k, v] of params.entries()) {
        payload[k] = v;
      }

      console.log('Status:', payload.status);
      console.log('TxnId:', payload.txnid);
      console.log('mihpayid:', payload.mihpayid);
      console.log('Amount:', payload.amount);

      // Save raw callback
      fs.writeFileSync(
        path.join(projectRoot, 'database', 'captured_payu_callback.json'),
        JSON.stringify(payload, null, 2),
        'utf8'
      );

      // 1. Verify Reverse Hash
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

      const calcSequence = additionalCharges ? `${additionalCharges}|${baseSequence}` : baseSequence;
      const expectedHash = crypto.createHash('sha512').update(calcSequence).digest('hex').toLowerCase();

      const isHashValid = hash && hash.toLowerCase() === expectedHash;
      console.log('Reverse Hash Valid:', isHashValid);

      if (!isHashValid) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('INVALID_HASH');
        return;
      }

      // 2. Perform Real Server-to-Server verify_payment to PayU PostService
      console.log('[Listener] Calling real PayU PostService verify_payment for txnid:', txnid);
      const postHash = crypto.createHash('sha512').update(`${key}|verify_payment|${txnid}|${salt}`).digest('hex').toLowerCase();
      const postParams = new URLSearchParams({ key, command: 'verify_payment', var1: txnid, hash: postHash });

      const verifyRes = await fetch('https://test.payu.in/merchant/postservice.php?form=2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: postParams.toString(),
      });

      const verifyData = await verifyRes.json();
      console.log('[Listener] Real PayU PostService Response:');
      console.log(JSON.stringify(verifyData, null, 2));

      fs.writeFileSync(
        path.join(projectRoot, 'database', 'verified_payu_postservice.json'),
        JSON.stringify(verifyData, null, 2),
        'utf8'
      );

      const txnDetails = verifyData.transaction_details ? verifyData.transaction_details[txnid] : null;

      if (!txnDetails || txnDetails.status !== 'success') {
        console.error('[Listener] PostService did not confirm success. Status:', txnDetails?.status);
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end(`GATEWAY_STATUS_NOT_SUCCESS: ${txnDetails?.status}`);
        return;
      }

      const realMihpayid = txnDetails.mihpayid;
      const verifiedAmount = parseFloat(txnDetails.amt || amount);
      const orderId = udf2;
      const attemptId = udf1;

      // 3. Perform Authoritative Settlement in PostgreSQL 16
      const { PGlite } = await import('@electric-sql/pglite');
      const dataDir = path.join(projectRoot, 'database', 'pg_commerce_dev');
      const db = new PGlite(dataDir);

      const settleRes = await db.query(
        `SELECT success, status_code, payment_id, anomaly_id 
         FROM commerce.settle_payment_authoritative($1, $2, $3, $4, NOW(), $5);`,
        [orderId, attemptId, realMihpayid, verifiedAmount, JSON.stringify({ callback: payload, verification: txnDetails })]
      );

      const row = settleRes.rows[0];
      console.log('[Listener] Authoritative Database Settlement Result:', row);

      await db.close();

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<html><body><h1>Payment Confirmed!</h1><p>Order ${orderId} settled under PayU ID ${realMihpayid}</p></body></html>`);
    } catch (err) {
      console.error('[Listener] Error processing callback:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('INTERNAL_SERVER_ERROR');
    }
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/payment/payu-callback') {
    handlePayUCallback(req, res);
  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[PayU Callback Listener] Server listening on http://0.0.0.0:${PORT}/api/payment/payu-callback`);
});
