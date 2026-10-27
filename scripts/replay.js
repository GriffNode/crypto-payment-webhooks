// Send one signed event N times, like a provider retrying. Signed with YOUR secret: a local test tool.
// Resets the order to pending first, so every run starts clean.
import crypto from 'node:crypto';
import { db } from '../db.js';

const [orderId = 'T-1', times = '5', type = 'payment.completed'] = process.argv.slice(2);
const eventId = `evt_test_${orderId}`;
db.prepare("INSERT INTO orders (id) VALUES (?) ON CONFLICT (id) DO UPDATE SET status = 'pending'").run(orderId);
db.prepare('DELETE FROM webhook_events WHERE id = ?').run(eventId);

const body = JSON.stringify({ id: eventId, event: type, metadata: { order_id: orderId } });
const signature = 'sha256=' + crypto.createHmac('sha256', process.env.GRIFFNODE_WEBHOOK_SECRET).update(body).digest('hex');

for (let i = 1; i <= Number(times); i++) {
  const res = await fetch('http://localhost:3033/webhooks/griffnode', {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/json', 'X-GriffNode-Signature': signature, 'X-GriffNode-Attempt': String(i) },
  });
  console.log(`attempt ${i} → ${res.status}`);
}
console.log(`order ${orderId} is now: ${db.prepare('SELECT status FROM orders WHERE id = ?').get(orderId).status}`);
