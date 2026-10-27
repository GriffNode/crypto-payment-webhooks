// Bug 2: verifying a re-serialized body. Passes most events, fails the ones with an "&" (or any provider that pretty-prints).
import express from 'express';
import { isValidSignature } from '../utils/signature.js';

const app = express();
app.use(express.json()); // parses the body before the webhook route sees it

app.post('/webhooks/griffnode', (req, res) => {
  const body = JSON.stringify(req.body); // the popular "fix": not the bytes that were signed
  const ok = isValidSignature(body, req.get('X-GriffNode-Signature'), process.env.GRIFFNODE_WEBHOOK_SECRET);
  console.log(`${ok ? '\x1b[32m✓ 200' : '\x1b[31m✗ 401  invalid signature'}  ${req.body.event}  "${req.body.metadata?.product}"\x1b[0m`);
  res.sendStatus(ok ? 200 : 401);
});

app.listen(3033, () => console.log('restringify shop on http://localhost:3033'));
