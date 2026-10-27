import express from 'express';
import { isValidSignature } from '../utils/signature.js';
import { handlePaymentEvent } from '../services/payments.js';

export const webhooks = express.Router();

// express.raw: the signature covers the exact bytes we received, so no JSON parser touches them first.
webhooks.post('/webhooks/griffnode', express.raw({ type: 'application/json' }), (req, res) => {
  if (!isValidSignature(req.body, req.get('X-GriffNode-Signature'), process.env.GRIFFNODE_WEBHOOK_SECRET)) {
    console.log('\x1b[31m✗ 401  invalid signature, ignored\x1b[0m');
    return res.sendStatus(401);
  }

  const event = JSON.parse(req.body);
  const result = handlePaymentEvent(event); // records the fact and returns; shipping runs elsewhere
  const color = result.startsWith('PAID') ? 32 : result.startsWith('duplicate') ? 90 : 33;
  console.log(`\x1b[${color}m✓ 200  ${event.event}  order ${event.metadata?.order_id ?? '-'}  attempt ${req.get('X-GriffNode-Attempt') ?? '-'}  → ${result}\x1b[0m`);
  res.sendStatus(200);
});
