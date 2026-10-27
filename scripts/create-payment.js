import { db } from '../db.js';

const [orderId = '1042', amount = '5', crypto = 'LTC', product = 'Test order'] = process.argv.slice(2);

const res = await fetch('https://api.griffnode.com/v1/transactions/create', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.GRIFFNODE_API_KEY}`,
    'Content-Type': 'application/json',
    'X-Idempotency-Key': `order-${orderId}-${crypto}`, // same order + same coin = same payment
  },
  body: JSON.stringify({ crypto, amount: Number(amount), currency_fiat: 'USD', metadata: { order_id: orderId, product } }),
});

const body = await res.json();
if (!body.success) throw new Error(`${body.error}: ${body.message}`);

db.prepare('INSERT INTO orders (id, tx_id) VALUES (?, ?) ON CONFLICT (id) DO UPDATE SET tx_id = excluded.tx_id').run(orderId, body.data.transaction_id);
console.log(`order ${orderId}  ${body.data.amount_crypto} ${crypto} → ${body.data.deposit_address}`);
console.log(body.data.payment_url);
