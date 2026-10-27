// Run: npm test
import assert from 'node:assert';
import crypto from 'node:crypto';

process.env.DB_FILE = ':memory:';
const { db } = await import('./db.js');
const { handlePaymentEvent } = await import('./services/payments.js');
const { isValidSignature } = await import('./utils/signature.js');
const sign = (body, secret = 'whsec') => 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');

// Signatures
const body = Buffer.from('{"event":"payment.completed"}');
assert.ok(isValidSignature(body, sign(body), 'whsec'));
assert.ok(!isValidSignature(body, sign(body), 'wrong'));
assert.ok(!isValidSignature(body, undefined, 'whsec'));

// Bug 2: Go's encoder sends "&" as &. Parse + JSON.stringify gives different bytes → signature fails.
const goBody = '{"event":"payment.completed","metadata":{"product":"Salt \\u0026 Pepper"}}';
assert.ok(isValidSignature(Buffer.from(goBody), sign(goBody), 'whsec'));
assert.ok(!isValidSignature(JSON.stringify(JSON.parse(goBody)), sign(goBody), 'whsec'));

// Bug 3: the same event five times → paid once
db.prepare("INSERT INTO orders (id) VALUES ('A')").run();
const paid = { id: 'evt_1', event: 'payment.completed', metadata: { order_id: 'A' } };
const results = Array.from({ length: 5 }, () => handlePaymentEvent(paid));
assert.deepEqual(results, ['PAID, queued for shipping', ...Array(4).fill('duplicate, skipped')]);

// A different event for an already-paid order doesn't pay it twice
assert.equal(handlePaymentEvent({ ...paid, id: 'evt_2', event: 'payment.overpaid' }), 'already paid');

// Bug 4: pending isn't paid, overpaid is
db.prepare("INSERT INTO orders (id) VALUES ('B')").run();
assert.equal(handlePaymentEvent({ id: 'evt_3', event: 'payment.pending', metadata: { order_id: 'B' } }), 'noted, not paid yet');
assert.equal(handlePaymentEvent({ id: 'evt_4', event: 'payment.overpaid', metadata: { order_id: 'B' } }), 'PAID, queued for shipping');

console.log('ok');
