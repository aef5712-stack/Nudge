import postgres from "postgres";
import bcrypt from "bcryptjs";

// DATABASE_URL is added automatically when you connect Neon to the project in Vercel.
// It is never written in the code.
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;

declare global {
  // eslint-disable-next-line no-var
  var __nudgeSql: postgres.Sql | undefined;
  // eslint-disable-next-line no-var
  var __nudgeReady: Promise<void> | undefined;
}

function client() {
  if (!url) throw new Error("DATABASE_URL is not set. Connect a Neon database to this project in Vercel.");
  if (!global.__nudgeSql) {
    const local = /localhost|127\.0\.0\.1/.test(url);
    global.__nudgeSql = postgres(url, { ssl: local ? false : "require", max: 5, prepare: false });
  }
  return global.__nudgeSql;
}

export const DEMO_EMAIL = "demo@demo.com";
const DEMO_PASSWORD = "password123!";

// Creates the tables (if they don't exist yet) and makes sure the demo account exists with full access.
async function setup() {
  const sql = client();
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'free',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS lists (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#5b4bdb',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      list_id INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      due_date DATE NOT NULL,
      start_time TEXT NOT NULL DEFAULT '',
      duration_minutes INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      done BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await sql`CREATE INDEX IF NOT EXISTS tasks_user_date ON tasks (user_id, due_date)`;
  await sql`
    CREATE TABLE IF NOT EXISTS payments (
      stripe_session_id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;

  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await sql`
    INSERT INTO users (email, name, password_hash, plan)
    VALUES (${DEMO_EMAIL}, 'Demo User', ${hash}, 'ai')
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, plan = 'ai'`;
  await sql`
    INSERT INTO lists (user_id, name)
    SELECT id, 'My tasks' FROM users u
    WHERE email = ${DEMO_EMAIL} AND NOT EXISTS (SELECT 1 FROM lists l WHERE l.user_id = u.id)`;
}

/** Returns the database client, after making sure the tables and demo account exist. */
export async function db() {
  if (!global.__nudgeReady) {
    global.__nudgeReady = setup().catch((e) => {
      global.__nudgeReady = undefined;
      throw e;
    });
  }
  await global.__nudgeReady;
  return client();
}
