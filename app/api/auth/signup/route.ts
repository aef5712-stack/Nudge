import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { err } from "@/lib/http";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim().slice(0, 80);
  const password = String(body.password ?? "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err("Please enter a valid email address.");
  if (!name) return err("Please enter your name.");
  if (password.length < 8) return err("Password must be at least 8 characters.");

  const sql = await db();
  const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
  if (existing.length) return err("An account with that email already exists. Try logging in.", 409);

  const hash = await bcrypt.hash(password, 10);
  const [user] = await sql`
    INSERT INTO users (email, name, password_hash) VALUES (${email}, ${name}, ${hash}) RETURNING id`;
  // Give every new account a starter list so the dashboard isn't empty.
  await sql`INSERT INTO lists (user_id, name) VALUES (${user.id}, 'My tasks')`;
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
