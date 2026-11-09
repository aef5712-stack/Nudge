import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { db } from "@/lib/db";
import { err, isDate, isTime, requireUser } from "@/lib/http";
import { PLANS } from "@/lib/plans";

export const maxDuration = 300; // planning a whole syllabus can take a minute or two

// The AI's answer must match this shape exactly (structured outputs).
const PlanSchema = z.object({
  list_name: z.string().describe("Short name for this plan, e.g. 'BIO 110 – Fall' or 'Week of Nov 10'"),
  summary: z.string().describe("2-4 sentences for the user: what you found, how you spread the work, anything to watch out for"),
  tasks: z.array(
    z.object({
      title: z.string().describe("Specific and actionable, e.g. 'Draft intro + outline for History essay'"),
      date: z.string().describe("YYYY-MM-DD"),
      start_time: z.string().describe("24h HH:MM, or empty string if it has no set time"),
      duration_minutes: z.number().int().describe("Estimated minutes; 0 for a deadline marker"),
      notes: z.string().describe("Short helpful detail (what to bring, which chapter, the real due date). May be empty."),
    }),
  ),
});

const SYSTEM = `You are Nudge, an AI planner for busy students and professionals. The user gives you their syllabuses, calendars, assignment sheets and to-do items. You turn them into a realistic day-by-day schedule so that everything gets done on time.

How to plan:
- Find every deadline, exam, quiz, reading, meeting and event in the materials. Use exact dates when given. If a year is missing, assume the next upcoming occurrence on or after today's date.
- Add each real deadline or event as its own task whose title starts with "DUE:" (assignments), "EXAM:" (tests/quizzes) or "EVENT:" (classes/meetings with a fixed time). Give fixed events their real start time.
- Break big work into smaller work sessions scheduled BEFORE the deadline: e.g. an essay becomes research, outline, draft, revise; an exam becomes 2-4 study sessions spread over the days before it. Small tasks can be a single session.
- Keep days humane: aim for no more than about 3 hours of planned work sessions on a weekday and 4 on a weekend day, unless a deadline makes it impossible. Never stack sessions on top of the user's existing tasks or fixed events at the same time.
- Follow the user's preferences about when they like to work. If none are given, schedule weekday work sessions between 16:00 and 21:00 and weekend sessions between 10:00 and 17:00.
- Never schedule anything before today's date. Only plan through the end date the user gives; deadlines after it can still be listed as DUE/EXAM markers.
- Keep it to at most 120 tasks. Prioritise the most important work if there is more.
- If the materials contain no dates or tasks at all, return an empty task list and explain in the summary what you need.`;

type FileIn = { name: string; type: string; data: string };
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"] as const;

export async function POST(req: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  if (!PLANS[user.plan].ai) return err("The AI planner is part of the Nudge AI plan. Upgrade to use it.", 402);
  if (!process.env.ANTHROPIC_API_KEY) return err("The AI isn't set up yet: ANTHROPIC_API_KEY is missing in Vercel.", 500);

  const body = await req.json().catch(() => ({}));
  const text = String(body.text ?? "").slice(0, 60000);
  const preferences = String(body.preferences ?? "").slice(0, 2000);
  const today = isDate(body.today) ? body.today : new Date().toISOString().slice(0, 10);
  const until = isDate(body.until) ? body.until : new Date(Date.parse(today) + 30 * 864e5).toISOString().slice(0, 10);
  const files: FileIn[] = Array.isArray(body.files) ? body.files.slice(0, 5) : [];
  if (!text.trim() && files.length === 0) return err("Paste some text or upload a syllabus, calendar or task list.");

  const sql = await db();
  const existing = await sql`
    SELECT to_char(due_date, 'YYYY-MM-DD') AS d, start_time, duration_minutes, title FROM tasks
    WHERE user_id = ${user.id} AND due_date BETWEEN ${today} AND ${until} AND NOT done
    ORDER BY due_date, start_time LIMIT 300`;

  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const f of files) {
    const data = String(f.data ?? "");
    if (f.type === "application/pdf") {
      content.push({ type: "document", title: f.name, source: { type: "base64", media_type: "application/pdf", data } });
    } else if ((IMAGE_TYPES as readonly string[]).includes(f.type)) {
      content.push({ type: "image", source: { type: "base64", media_type: f.type as (typeof IMAGE_TYPES)[number], data } });
    } else {
      // Plain-text files (.txt, .csv, .ics, .md) are sent as text.
      content.push({ type: "text", text: `File "${f.name}":\n${Buffer.from(data, "base64").toString("utf8").slice(0, 60000)}` });
    }
  }
  content.push({
    type: "text",
    text: [
      `Today is ${today} (${new Date(today + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" })}). Plan from today through ${until}.`,
      preferences ? `My preferences: ${preferences}` : "",
      existing.length
        ? `Already on my calendar (don't double-book these):\n${existing
            .map((t) => `- ${t.d}${t.start_time ? " " + t.start_time : ""}${t.duration_minutes ? ` (${t.duration_minutes} min)` : ""}: ${t.title}`)
            .join("\n")}`
        : "My calendar is currently empty.",
      text.trim() ? `Here is what I need to get done:\n${text}` : "Everything I need to get done is in the attached files.",
    ]
      .filter(Boolean)
      .join("\n\n"),
  });

  const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment
  let plan: z.infer<typeof PlanSchema>;
  try {
    const response = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      output_config: { effort: "medium", format: betaZodOutputFormat(PlanSchema) },
      // If a request is ever declined by a safety check, the API retries it on a fallback model automatically.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [{ role: "user", content }],
    });
    if (response.stop_reason === "refusal") return err("The AI couldn't help with that request. Try rewording it.", 422);
    if (response.stop_reason === "max_tokens" || !response.parsed_output) {
      return err("That was too much to plan in one go. Try a shorter date range or fewer files.", 422);
    }
    plan = response.parsed_output;
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return err("The ANTHROPIC_API_KEY in Vercel is not valid.", 500);
    if (e instanceof Anthropic.RateLimitError) return err("The AI is busy right now. Try again in a minute.", 429);
    if (e instanceof Anthropic.BadRequestError) return err(`The AI couldn't read that input: ${e.message}`, 400);
    if (e instanceof Anthropic.APIError) return err(`AI error (${e.status}). Try again.`, 502);
    throw e;
  }

  const valid = plan.tasks
    .filter((t) => isDate(t.date) && t.date >= today && isTime(t.start_time) && t.title.trim())
    .sort((a, b) => a.date.localeCompare(b.date));
  const [list] = await sql`
    INSERT INTO lists (user_id, name, color) VALUES (${user.id}, ${plan.list_name.slice(0, 60) || "AI plan"}, '#7048e8')
    RETURNING id, name, color`;
  if (valid.length) {
    const rows = valid.map((t) => ({
      user_id: user.id,
      list_id: list.id,
      title: t.title.slice(0, 200),
      due_date: t.date,
      start_time: t.start_time,
      duration_minutes: Math.max(0, Math.min(1440, Math.round(t.duration_minutes))),
      notes: t.notes.slice(0, 1000),
    }));
    await sql`INSERT INTO tasks ${sql(rows, "user_id", "list_id", "title", "due_date", "start_time", "duration_minutes", "notes")}`;
  }
  return NextResponse.json({ list, summary: plan.summary, count: valid.length, first_date: valid[0]?.date ?? today });
}
