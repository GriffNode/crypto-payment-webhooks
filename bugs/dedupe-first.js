// Bug 3b: the fix most tutorials give. Remember the event id first, then do the work.
// Crash in between and the retry is thrown away as a "duplicate": the order stays unpaid forever.
import express from 'express';
import { db } from '../db.js';
import { isValidSignature } from '../utils/signature.js';

const app = express();

app.post('/webhooks/griffnode', express.raw({ type: 'application/json' }), (req, res) => {
  if (!isValidSignature(req.body, req.get('X-GriffNode-Signature'), process.env.GRIFFNODE_WEBHOOK_SECRET)) return res.sendStatus(401);
  const event = JSON.parse(req.body);
  const order = event.metadata?.order_id;

  if (db.prepare('INSERT INTO webhook_events (id) VALUES (?) ON CONFLICT DO NOTHING').run(event.id).changes === 0) {
    console.log(`\x1b[90m↺ duplicate, skipped  order ${order}\x1b[0m`);
    return res.sendStatus(200);
  }
  if (process.env.CRASH && !globalThis.crashed) {  // simulate a deploy restart / OOM / DB timeout, once
    globalThis.crashed = true;
    console.log('\x1b[31m💥 crashed before marking the order paid\x1b[0m');
    return res.sendStatus(500);
  }
  db.prepare("UPDATE orders SET status = 'paid' WHERE id = ?").run(order);
  console.log(`\x1b[32m✓ order ${order} paid\x1b[0m`);
  res.sendStatus(200);
});

app.listen(3033, () => console.log('dedupe-first shop on http://localhost:3033'));
