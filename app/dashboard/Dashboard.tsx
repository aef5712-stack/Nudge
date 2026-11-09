"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type List = { id: number; name: string; color: string };
type Task = { id: number; list_id: number; title: string; due_date: string; start_time: string; duration_minutes: number; notes: string; done: boolean };
type U = { name: string; email: string; plan: "free" | "pro" | "ai"; planName: string; ai: boolean; maxLists: number | null };
type View = "day" | "week" | "month";

// ---- date helpers (local time, YYYY-MM-DD strings) ----
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (s: string, n: number) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
const startOfWeek = (s: string) => addDays(s, -parse(s).getDay());
const fmt = (s: string, o: Intl.DateTimeFormatOptions) => parse(s).toLocaleDateString("en-US", o);
const time12 = (t: string) => { if (!t) return ""; const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${pad(m)}${h < 12 ? "am" : "pm"}`; };
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function rangeFor(view: View, anchor: string): [string, string] {
  if (view === "day") return [anchor, anchor];
  if (view === "week") { const s = startOfWeek(anchor); return [s, addDays(s, 6)]; }
  const d = parse(anchor);
  const first = ymd(new Date(d.getFullYear(), d.getMonth(), 1));
  const last = ymd(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  return [startOfWeek(first), addDays(startOfWeek(last), 6)];
}

async function api(path: string, method: string, body?: unknown) {
  const res = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

export default function Dashboard({ user, initialLists }: { user: U; initialLists: List[] }) {
  const today = ymd(new Date());
  const [view, setView] = useState<View>("day");
  const [anchor, setAnchor] = useState(today);
  const [lists, setLists] = useState(initialLists);
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newList, setNewList] = useState("");
  const [draft, setDraft] = useState({ title: "", due_date: today, start_time: "", list_id: initialLists[0]?.id ?? 0 });

  const [from, to] = useMemo(() => rangeFor(view, anchor), [view, anchor]);
  const listById = useMemo(() => new Map(lists.map((l) => [l.id, l])), [lists]);

  const load = useCallback(async () => {
    setLoading(true);
    try { setTasks((await api(`/api/tasks?from=${from}&to=${to}`, "GET")).tasks); }
    catch (e) { setError((e as Error).message); }
    setLoading(false);
  }, [from, to]);
  useEffect(() => { load(); }, [load]);

  const visible = tasks.filter((t) => !hidden.has(t.list_id));
  const byDate = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of visible) m.set(t.due_date, [...(m.get(t.due_date) ?? []), t]);
    return m;
  }, [visible]);
  const inPeriod = view === "month"
    ? visible.filter((t) => t.due_date.slice(0, 7) === anchor.slice(0, 7))
    : visible;
  const doneCount = inPeriod.filter((t) => t.done).length;

  function shift(dir: number) {
    if (view === "day") setAnchor(addDays(anchor, dir));
    else if (view === "week") setAnchor(addDays(anchor, 7 * dir));
    else { const d = parse(anchor); setAnchor(ymd(new Date(d.getFullYear(), d.getMonth() + dir, 1))); }
  }
  const title = view === "day"
    ? (anchor === today ? "Today · " : "") + fmt(anchor, { weekday: "long", month: "long", day: "numeric" })
    : view === "week"
      ? `${fmt(from, { month: "short", day: "numeric" })} – ${fmt(to, { month: "short", day: "numeric", year: "numeric" })}`
      : fmt(anchor, { month: "long", year: "numeric" });

  async function toggle(t: Task) {
    setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, done: !t.done } : x)));
    try { await api("/api/tasks", "PATCH", { id: t.id, done: !t.done }); } catch (e) { setError((e as Error).message); load(); }
  }
  async function remove(t: Task) {
    setTasks((ts) => ts.filter((x) => x.id !== t.id));
    try { await api(`/api/tasks?id=${t.id}`, "DELETE"); } catch (e) { setError((e as Error).message); load(); }
  }
  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const { task } = await api("/api/tasks", "POST", { ...draft, list_id: draft.list_id || lists[0]?.id });
      if (task.due_date >= from && task.due_date <= to) setTasks((ts) => [...ts, task].sort(sortTasks));
      setDraft((d) => ({ ...d, title: "" }));
    } catch (e) { setError((e as Error).message); }
  }
  async function addList(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const { list } = await api("/api/lists", "POST", { name: newList });
      setLists((ls) => [...ls, list]);
      setNewList("");
      if (!draft.list_id) setDraft((d) => ({ ...d, list_id: list.id }));
    } catch (e) { setError((e as Error).message); }
  }
  async function removeList(l: List) {
    if (!confirm(`Delete "${l.name}" and all of its tasks?`)) return;
    await api(`/api/lists?id=${l.id}`, "DELETE");
    setLists((ls) => ls.filter((x) => x.id !== l.id));
    setTasks((ts) => ts.filter((t) => t.list_id !== l.id));
  }
  async function checkout(plan: "pro" | "ai") {
    setError("");
    try { window.location.href = (await api("/api/checkout", "POST", { plan })).url; }
    catch (e) { setError((e as Error).message); }
  }
  function openDay(d: string) { setAnchor(d); setView("day"); }

  const atLimit = user.maxLists !== null && lists.length >= user.maxLists;

  return (
    <div className="wrap">
      <div className="dash-top">
        <Link href="/" className="logo">nudge<span>.</span></Link>
        <div className="nav-links">
          <span className="small muted">Hi, {user.name.split(" ")[0]}</span>
          <span className="plan-pill">{user.planName}</span>
          <form action="/api/auth/logout" method="post"><button className="btn ghost sm">Log out</button></form>
        </div>
      </div>

      <div className="dash">
        <aside className="side">
          <div className="card">
            <h4>My lists</h4>
            <ul className="lists">
              {lists.map((l) => (
                <li key={l.id}>
                  <input type="checkbox" style={{ width: 16, accentColor: l.color }} checked={!hidden.has(l.id)} aria-label={`Show ${l.name}`}
                    onChange={() => setHidden((h) => { const n = new Set(h); if (n.has(l.id)) n.delete(l.id); else n.add(l.id); return n; })} />
                  <span className="dot" style={{ background: l.color }} />
                  <span>{l.name}</span>
                  <button className="x" title="Delete list" onClick={() => removeList(l)}>✕</button>
                </li>
              ))}
            </ul>
            {atLimit ? (
              <p className="small muted">You&apos;ve used {lists.length} of {user.maxLists} lists on Basic. Upgrade for unlimited lists.</p>
            ) : (
              <form className="inline" onSubmit={addList}>
                <input placeholder="New list…" value={newList} onChange={(e) => setNewList(e.target.value)} />
                <button className="btn sm">Add</button>
              </form>
            )}
          </div>

          {user.plan !== "ai" && (
            <div className="card upsell">
              <h4>Upgrade</h4>
              {user.plan === "free" && (
                <>
                  <p><strong>Pro · $4.99</strong><br />Unlimited lists and calendars.</p>
                  <button className="btn sm" style={{ width: "100%", marginBottom: 12 }} onClick={() => checkout("pro")}>Get Pro</button>
                </>
              )}
              <p><strong>Nudge AI · $9.99</strong><br />Upload syllabuses and let AI plan your weeks.</p>
              <button className="btn sm" style={{ width: "100%" }} onClick={() => checkout("ai")}>Get Nudge AI ✨</button>
            </div>
          )}
        </aside>

        <main>
          <AiPlanner enabled={user.ai} today={today} onUpgrade={() => checkout("ai")}
            onDone={(list, firstDate) => { setLists((ls) => [...ls, list]); setAnchor(firstDate); setView("week"); load(); }} />

          <div className="toolbar" style={{ marginTop: 22 }}>
            <div className="range">{title}</div>
            <button className="btn ghost sm" onClick={() => shift(-1)} aria-label="Previous">←</button>
            <button className="btn ghost sm" onClick={() => setAnchor(today)}>Today</button>
            <button className="btn ghost sm" onClick={() => shift(1)} aria-label="Next">→</button>
            <div className="seg">
              {(["day", "week", "month"] as View[]).map((v) => (
                <button key={v} className={view === v ? "on" : ""} onClick={() => setView(v)}>
                  {v === "day" ? "Daily" : v === "week" ? "Weekly" : "Monthly"}
                </button>
              ))}
            </div>
          </div>

          <div className="progress" title={`${doneCount} of ${inPeriod.length} done`}>
            <div style={{ width: inPeriod.length ? `${(doneCount / inPeriod.length) * 100}%` : 0 }} />
          </div>
          <p className="small muted" style={{ marginTop: -10 }}>
            {inPeriod.length ? `${doneCount} of ${inPeriod.length} tasks done ${view === "day" ? "today" : `this ${view}`}` : ""}
          </p>

          {lists.length > 0 && (
            <form className="addform" onSubmit={addTask}>
              <input placeholder="Add a task…" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required />
              <input type="date" value={draft.due_date} onChange={(e) => setDraft({ ...draft, due_date: e.target.value })} required aria-label="Date" />
              <input type="time" value={draft.start_time} onChange={(e) => setDraft({ ...draft, start_time: e.target.value })} aria-label="Time (optional)" />
              <select value={draft.list_id} onChange={(e) => setDraft({ ...draft, list_id: Number(e.target.value) })} aria-label="List">
                {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <button className="btn">Add</button>
            </form>
          )}
          {error && <p className="error" role="alert">{error}</p>}

          {loading ? <p className="muted">Loading…</p> : view === "day" ? (
            (byDate.get(anchor) ?? []).length === 0 ? (
              <div className="empty">Nothing planned for this day. Add a task above{user.ai ? " or let the AI planner build your schedule" : ""}.</div>
            ) : (
              (byDate.get(anchor) ?? []).map((t) => <TaskRow key={t.id} t={t} list={listById.get(t.list_id)} onToggle={toggle} onDelete={remove} />)
            )
          ) : view === "week" ? (
            <div className="week">
              {Array.from({ length: 7 }, (_, i) => addDays(from, i)).map((d) => (
                <div key={d} className={`wday ${d === today ? "today" : ""}`}>
                  <h5 onClick={() => openDay(d)}>{fmt(d, { weekday: "short", month: "short", day: "numeric" })}</h5>
                  {(byDate.get(d) ?? []).map((t) => (
                    <div key={t.id} className={`chip ${t.done ? "done" : ""}`} style={{ borderLeftColor: listById.get(t.list_id)?.color }}
                      title={`${t.title}${t.notes ? ` – ${t.notes}` : ""}`} onClick={() => toggle(t)}>
                      {t.start_time && <strong>{time12(t.start_time)} </strong>}{t.title}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="month">
              {DOW.map((d) => <div key={d} className="mhead">{d}</div>)}
              {Array.from({ length: Math.round((parse(to).getTime() - parse(from).getTime()) / 864e5) + 1 }, (_, i) => addDays(from, i)).map((d) => {
                const ts = byDate.get(d) ?? [];
                return (
                  <div key={d} className={`mcell ${d.slice(0, 7) !== anchor.slice(0, 7) ? "other" : ""} ${d === today ? "today" : ""}`} onClick={() => openDay(d)}>
                    <div className="n">{parse(d).getDate()}{ts.length > 0 && <span className="muted"> · {ts.length}</span>}</div>
                    {ts.slice(0, 3).map((t) => (
                      <div key={t.id} className={`chip ${t.done ? "done" : ""}`} style={{ borderLeftColor: listById.get(t.list_id)?.color }}>{t.title}</div>
                    ))}
                    {ts.length > 3 && <div className="more">+{ts.length - 3} more</div>}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function sortTasks(a: Task, b: Task) {
  return a.due_date.localeCompare(b.due_date) || (a.start_time || "99").localeCompare(b.start_time || "99") || a.id - b.id;
}

function TaskRow({ t, list, onToggle, onDelete }: { t: Task; list?: List; onToggle: (t: Task) => void; onDelete: (t: Task) => void }) {
  return (
    <div className={`task ${t.done ? "done" : ""}`}>
      <input type="checkbox" checked={t.done} onChange={() => onToggle(t)} aria-label={`Mark "${t.title}" done`} />
      <div className="t">
        <div className="title">{t.title}</div>
        <div className="meta">
          {t.start_time && <span>🕒 {time12(t.start_time)}</span>}
          {t.duration_minutes > 0 && <span>{t.duration_minutes} min</span>}
          {list && <span><span className="dot" style={{ background: list.color, display: "inline-block", marginRight: 4 }} />{list.name}</span>}
          {t.notes && <span>· {t.notes}</span>}
        </div>
      </div>
      <button className="del" onClick={() => onDelete(t)} title="Delete task">🗑</button>
    </div>
  );
}

type FileIn = { name: string; type: string; data: string };
const MAX_BYTES = 3_000_000;

function AiPlanner({ enabled, today, onUpgrade, onDone }: { enabled: boolean; today: string; onUpgrade: () => void; onDone: (list: List, firstDate: string) => void }) {
  const [text, setText] = useState("");
  const [prefs, setPrefs] = useState("");
  const [until, setUntil] = useState(addDays(today, 30));
  const [files, setFiles] = useState<FileIn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ list: List; summary: string; count: number; first_date: string } | null>(null);

  async function addFiles(fl: FileList | null) {
    setError("");
    const next = [...files];
    for (const f of Array.from(fl ?? [])) {
      const data = await new Promise<string>((res) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result).split(",")[1] ?? "");
        r.readAsDataURL(f);
      });
      next.push({ name: f.name, type: f.type || "text/plain", data });
    }
    if (next.reduce((n, f) => n + f.data.length, 0) > MAX_BYTES) { setError("Files are too big (max about 2 MB total). Try fewer pages or a screenshot."); return; }
    setFiles(next.slice(0, 5));
  }

  async function plan(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setResult(null);
    try {
      const data = await api("/api/ai/plan", "POST", { text, preferences: prefs, files, today, until });
      setResult(data);
      setText(""); setFiles([]);
      onDone(data.list, data.first_date);
    } catch (err) { setError((err as Error).message); }
    setBusy(false);
  }

  if (!enabled) {
    return (
      <div className="card ai locked">
        <h3>✨ AI planner</h3>
        <p>Upload your syllabuses, calendars and assignments and Nudge AI builds a day-by-day schedule that gets everything done on time.</p>
        <button className="btn sm" style={{ marginTop: 12 }} onClick={onUpgrade}>Unlock with Nudge AI · $9.99</button>
      </div>
    );
  }

  return (
    <form className="card ai" onSubmit={plan}>
      <h3>✨ AI planner</h3>
      <p>Upload a syllabus, a screenshot of your calendar, or paste everything you need to get done. Nudge finds the deadlines and builds your schedule.</p>
      <label htmlFor="ai-text">What do you need to get done?</label>
      <textarea id="ai-text" rows={5} value={text} onChange={(e) => setText(e.target.value)}
        placeholder={"e.g.\nHistory essay (2,000 words) due Nov 20\nCalc midterm Nov 14, covers ch. 3–5\nRead ch. 6–8 for BIO 110 by Friday\nWork shifts Mon/Wed 5–9pm"} />
      <label>Files (syllabus PDF, calendar screenshot, .txt)</label>
      <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.md,.csv,.ics" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
      <div>{files.map((f, i) => (
        <span key={i} className="filechip">📄 {f.name}<button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label="Remove">✕</button></span>
      ))}</div>
      <div className="row2">
        <div>
          <label htmlFor="ai-prefs">When do you like to work? (optional)</label>
          <input id="ai-prefs" value={prefs} onChange={(e) => setPrefs(e.target.value)} placeholder="e.g. mornings before 11, never Sundays" />
        </div>
        <div>
          <label htmlFor="ai-until">Plan through</label>
          <input id="ai-until" type="date" min={today} value={until} onChange={(e) => setUntil(e.target.value)} />
        </div>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn" style={{ marginTop: 16 }} disabled={busy || (!text.trim() && !files.length)}>
        {busy ? <><span className="spinner" /> Planning… (this can take a minute)</> : "Build my plan"}
      </button>
      {result && (
        <div className="result">
          <strong>Added {result.count} tasks to a new list.</strong> {result.summary}
          <div style={{ marginTop: 8 }}><button type="button" className="btn sm" onClick={() => onDone(result.list, result.first_date)}>See my plan →</button></div>
        </div>
      )}
    </form>
  );
}
