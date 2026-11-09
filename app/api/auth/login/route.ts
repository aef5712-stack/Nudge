import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { err } from "@/lib/http";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  const sql = await db();
  const [user] = await sql`SELECT id, password_hash FROM users WHERE email = ${email}`;
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return err("Wrong email or password.", 401);
  }
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
