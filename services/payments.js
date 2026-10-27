import { db } from '../db.js';

// Overpaid is still paid. Ship on payment.completed only and an overpaid order never ships.
const PAID = new Set(['payment.completed', 'payment.overpaid']);

const saveEvent = db.prepare('INSERT INTO webhook_events (id) VALUES (?) ON CONFLICT DO NOTHING');
const markPaid = db.prepare("UPDATE orders SET status = 'paid' WHERE id = ? AND status = 'pending'");

// One transaction: if anything throws, the event id is rolled back too, so the retry still counts.
export const handlePaymentEvent = db.transaction((event) => {
  if (saveEvent.run(event.id).changes === 0) return 'duplicate, skipped';
  if (!PAID.has(event.event)) return 'noted, not paid yet';
  return markPaid.run(event.metadata?.order_id).changes === 1 ? 'PAID, queued for shipping' : 'already paid';
});

// Same transition for the API backstop (scripts/reconcile.js): only pending → paid, once.
export const markOrderPaid = (orderId) => markPaid.run(orderId).changes === 1;
