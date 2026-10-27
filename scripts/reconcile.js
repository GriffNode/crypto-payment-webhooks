// The safety net. Webhooks are the fast path; run this on a cron every few minutes.
// Asks the API about every order still pending and applies the same pending → paid transition.
import { db } from '../db.js';
import { markOrderPaid } from '../services/payments.js';

const open = db.prepare("SELECT id, tx_id FROM orders WHERE status = 'pending' AND tx_id IS NOT NULL LIMIT 100").all();
if (!open.length) process.exit(console.log('nothing pending'));

const res = await fetch(`https://api.griffnode.com/v1/transactions/list?ids=${open.map((o) => o.tx_id).join(',')}`, {
  headers: { Authorization: `Bearer ${process.env.GRIFFNODE_API_KEY}` },
});
const body = await res.json();
if (!body.success) throw new Error(`${body.error}: ${body.message}`);

for (const tx of body.data.transactions) {
  const order = open.find((o) => o.tx_id === tx.transaction_id);
  const paid = tx.status === 'completed' && markOrderPaid(order.id);
  console.log(`order ${order.id}  ${tx.status}${paid ? '  → PAID (the webhook never made it)' : ''}`);
}
