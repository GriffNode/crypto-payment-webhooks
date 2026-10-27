import Database from 'better-sqlite3';

export const db = new Database(process.env.DB_FILE ?? 'shop.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, tx_id TEXT, status TEXT NOT NULL DEFAULT 'pending');
  CREATE TABLE IF NOT EXISTS webhook_events (id TEXT PRIMARY KEY, received_at TEXT DEFAULT CURRENT_TIMESTAMP);
`);
