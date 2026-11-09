import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { err, isDate, isTime, requireUser } from "@/lib/http";

const COLS = (sql: Awaited<ReturnType<typeof db>>) =>
  sql`id, list_id, title, to_char(due_date, 'YYYY-MM-DD') AS due_date, start_time, duration_minutes, notes, done`;

export async function GET(req: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const p = new URL(req.url).searchParams;
  const from = p.get("from");
  const to = p.get("to");
  if (!isDate(from) || !isDate(to)) return err("Bad date range.");
  const sql = await db();
  const tasks = await sql`
    SELECT ${COLS(sql)} FROM tasks
    WHERE user_id = ${user.id} AND due_date BETWEEN ${from} AND ${to}
    ORDER BY due_date, (start_time = ''), start_time, id`;
  return NextResponse.json({ tasks });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const b = await req.json().catch(() => ({}));
  const title = String(b.title ?? "").trim().slice(0, 200);
  const listId = Number(b.list_id);
  const time = b.start_time ?? "";
  if (!title) return err("Task needs a title.");
  if (!isDate(b.due_date)) return err("Pick a date.");
  if (!isTime(time)) return err("Time must look like 14:30.");

  const sql = await db();
  const [list] = await sql`SELECT id FROM lists WHERE id = ${listId} AND user_id = ${user.id}`;
  if (!list) return err("Pick one of your lists.");
  const [task] = await sql`
    INSERT INTO tasks (user_id, list_id, title, due_date, start_time, duration_minutes, notes)
    VALUES (${user.id}, ${listId}, ${title}, ${b.due_date}, ${time},
            ${Math.max(0, Math.min(1440, Number(b.duration_minutes) || 0))}, ${String(b.notes ?? "").slice(0, 1000)})
    RETURNING ${COLS(sql)}`;
  return NextResponse.json({ task });
}

export async function PATCH(req: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const b = await req.json().catch(() => ({}));
  const sql = await db();
  const [task] = await sql`
    UPDATE tasks SET done = ${Boolean(b.done)} WHERE id = ${Number(b.id)} AND user_id = ${user.id}
    RETURNING ${COLS(sql)}`;
  if (!task) return err("Task not found.", 404);
  return NextResponse.json({ task });
}

export async function DELETE(req: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const id = Number(new URL(req.url).searchParams.get("id"));
  const sql = await db();
  await sql`DELETE FROM tasks WHERE id = ${id} AND user_id = ${user.id}`;
  return NextResponse.json({ ok: true });
}
