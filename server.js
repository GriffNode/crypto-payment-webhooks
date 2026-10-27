import express from 'express';
import { webhooks } from './routes/webhooks.js';

const app = express();
app.use(webhooks);       // BEFORE express.json(): the webhook route needs the raw body
app.use(express.json()); // the rest of your shop

app.listen(3033, () => console.log('shop on http://localhost:3033'));
