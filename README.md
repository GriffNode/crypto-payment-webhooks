# Crypto payment webhooks in Node.js, without shipping an order twice

Code from the video. Works with any provider that signs its webhooks; the examples use GriffNode.

```
npm install
cp .env.example .env
npm test                                  # signatures, duplicates, pending vs paid
node --env-file=.env server.js            # the fixed version, on :3033
cloudflared tunnel --url http://localhost:3033   # public URL → your webhook endpoint
```

## The four bugs

| | Bug | Shown in | Fix |
|---|---|---|---|
| 1 | Trusting the request | `bugs/naive.js` | verify `X-GriffNode-Signature` (HMAC-SHA256), `utils/signature.js` |
| 2 | Verifying a re-serialized body | `bugs/restringify.js` | `express.raw` on the webhook route, mounted before `express.json()` |
| 3 | Processing a retry twice | `bugs/naive.js`, `bugs/dedupe-first.js` | answer fast; event id + state change in ONE transaction, `services/payments.js` |
| 4 | Treating "seen" as "paid" | `bugs/naive.js` | ship on `payment.completed` **and** `payment.overpaid`, never on `payment.pending` |

Anyone can hit your endpoint:

```
curl -X POST localhost:3033/webhooks/griffnode -H 'Content-Type: application/json' \
  -d '{"id":"evt_fake","event":"payment.completed","metadata":{"order_id":"1043"}}'
```

Send the same signed event five times, like a provider retrying:

```
node --env-file=.env scripts/replay.js T-1 5
```

Webhooks are the fast path, not the only one. If your server is down longer than the retry window
(GriffNode: 24 hours), events are gone. `scripts/reconcile.js` asks the API about every order still
pending; run it on a cron.

Webhooks on GriffNode are on the Business plan. Disclosure: we build GriffNode. Everything here works without it.
