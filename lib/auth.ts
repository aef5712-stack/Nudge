import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { db } from "./db";
import { planOf, type Plan } from "./plans";

const COOKIE = "nudge_session";
const DAYS = 30;

export type User = { id: number; email: string; name: string; plan: Plan };

export async function createSession(userId: number) {
  const sql = await db();
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + DAYS * 864e5);
  await sql`INSERT INTO sessions (token, user_id, expires_at) VALUES (${token}, ${userId}, ${expires})`;
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function getUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const sql = await db();
  const rows = await sql`
    SELECT u.id, u.email, u.name, u.plan FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ${token} AND s.expires_at > now()`;
  const r = rows[0];
  if (!r) return null;
  return { id: r.id, email: r.email, name: r.name, plan: planOf(r.plan) };
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    const sql = await db();
    await sql`DELETE FROM sessions WHERE token = ${token}`;
  }
  jar.delete(COOKIE);
}
