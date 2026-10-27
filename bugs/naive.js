// What NOT to do: the handler from the start of the video. Run it, then run ../server.js.
import express from 'express';

const app = express();
app.use(express.json());

app.post('/webhooks/griffnode', async (req, res) => {
  const event = req.body;                          // bug 1: never checks who sent it
  if (event.event === 'payment.completed') {       // bug 4: an overpaid order never ships
    const order = event.metadata?.order_id;
    console.log(`📦 shipping order ${order}…  attempt ${req.get('X-GriffNode-Attempt') ?? '-'}`);
    await new Promise((r) => setTimeout(r, 20_000)); // bug 3: slow work before answering → timeout → retry
    console.log(`\x1b[31m📦 SHIPPED order ${order}\x1b[0m`);
  }
  res.sendStatus(200);
});

app.listen(3033, () => console.log('naive shop on http://localhost:3033'));
