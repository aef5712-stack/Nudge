import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { err, requireUser } from "@/lib/http";
import { PLANS } from "@/lib/plans";

const COLORS = ["#5b4bdb", "#1f9d6b", "#d9480f", "#0b7285", "#c2255c", "#e67700", "#5f3dc4"];

export async function POST(req: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim().slice(0, 60);
  if (!name) return err("Give your list a name.");

  const sql = await db();
  const [{ count }] = await sql`SELECT count(*)::int AS count FROM lists WHERE user_id = ${user.id}`;
  const limit = PLANS[user.plan].maxLists;
  if (count >= limit) {
    return err(`The Basic plan includes ${limit} lists. Upgrade to Pro for unlimited lists.`, 402);
  }
  const color = COLORS[count % COLORS.length];
  const [list] = await sql`
    INSERT INTO lists (user_id, name, color) VALUES (${user.id}, ${name}, ${color}) RETURNING id, name, color`;
  return NextResponse.json({ list });
}

export async function DELETE(req: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const id = Number(new URL(req.url).searchParams.get("id"));
  const sql = await db();
  await sql`DELETE FROM lists WHERE id = ${id} AND user_id = ${user.id}`;
  return NextResponse.json({ ok: true });
}
