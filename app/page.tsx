import Link from "next/link";
import { PLANS, money } from "@/lib/plans";

export default function Home() {
  return (
    <div className="wrap">
      <nav className="nav">
        <Link href="/" className="logo">nudge<span>.</span></Link>
        <div className="nav-links">
          <a className="hide-sm" href="#how">How it works</a>
          <a className="hide-sm" href="#pricing">Pricing</a>
          <Link href="/login">Log in</Link>
          <Link className="btn sm" href="/signup">Start free</Link>
        </div>
      </nav>

      <header className="hero">
        <div>
          <span className="eyebrow">For students juggling classes, work and life</span>
          <h1>Drop in your syllabus. Get a plan that actually gets done.</h1>
          <p className="lede">
            Nudge is an AI planner and habit tracker. Upload your syllabuses, calendars and to-do lists and Nudge finds every
            deadline, breaks big assignments into small steps, and spreads them across your days so nothing sneaks up on you.
          </p>
          <div className="cta">
            <Link className="btn" href="/signup">Create a free account</Link>
            <Link className="btn ghost" href="/login">Log in</Link>
          </div>
        </div>
        <div className="mock" aria-label="Example day in Nudge">
          <h3>Today · Tuesday</h3>
          <div className="mrow done"><div className="mbox" /><span>Read ch. 4 for BIO 110</span><span className="mtime">9:30</span></div>
          <div className="mrow"><div className="mbox" /><span>Outline history essay (step 2 of 4)</span><span className="mtime">4:00</span></div>
          <div className="mrow"><div className="mbox" /><span>Calc study session: derivatives</span><span className="mtime">7:00</span></div>
          <div className="mrow"><div className="mbox" /><span>EXAM: Calc midterm</span><span className="mtime">Fri</span></div>
          <div className="nudge">👋 <strong>Nudge:</strong> Your essay is due Thursday. 45 minutes today keeps you on track.</div>
        </div>
      </header>

      <section className="band" id="how">
        <h2>How it works</h2>
        <p className="sub">Stop rebuilding your schedule by hand every week. Nudge does the planning so you can do the work.</p>
        <div className="grid3">
          <div className="card"><div className="step">STEP 1</div><h3>Give it everything</h3><p>Upload syllabus PDFs, screenshots of your calendar, or paste a messy list of tasks. Add when you like to work.</p></div>
          <div className="card"><div className="step">STEP 2</div><h3>AI builds your plan</h3><p>Nudge finds every due date and exam, breaks big projects into steps, and schedules them before the deadline without overloading any day.</p></div>
          <div className="card"><div className="step">STEP 3</div><h3>Check things off</h3><p>See your day, week or month at a glance. Check tasks off, track your progress, and add new tasks whenever life changes.</p></div>
        </div>
      </section>

      <section className="band">
        <h2>Who it&apos;s for</h2>
        <p className="sub">Anyone with more deadlines than hours, especially:</p>
        <div className="grid3">
          <div className="card"><h3>🎓 College students</h3><p>Five syllabuses, one brain. Turn a whole semester of readings, papers and exams into a weekly plan in a minute.</p></div>
          <div className="card"><h3>💼 Students who work</h3><p>Tell Nudge your shift times and it plans school work around them instead of on top of them.</p></div>
          <div className="card"><h3>✅ Habit builders</h3><p>Daily, weekly and monthly lists keep routines like workouts, reading and studying on track.</p></div>
        </div>
      </section>

      <section className="band">
        <h2>Why it&apos;s worth paying for</h2>
        <p className="sub">A missed deadline costs you points, a late fee or an all-nighter. Nudge costs less than a coffee.</p>
        <div className="grid3">
          <div className="card"><h3>Hours saved every week</h3><p>No more copying due dates from five PDFs into a planner. Nudge reads them for you.</p></div>
          <div className="card"><h3>No more last-minute cramming</h3><p>Work is spread out before each deadline, so big assignments become small daily steps.</p></div>
          <div className="card"><h3>One place for everything</h3><p>Classes, work, habits and errands in a single calendar, so nothing falls through the cracks.</p></div>
        </div>
      </section>

      <section className="band" id="pricing">
        <h2>Pricing</h2>
        <p className="sub">Start free. Upgrade once, keep it forever. No subscription.</p>
        <div className="grid3">
          <div className="card tier">
            <h3>{PLANS.free.name}</h3><div className="price">{money(PLANS.free.priceCents)}</div>
            <ul><li>Up to {PLANS.free.maxLists} to-do lists</li><li>Daily, weekly and monthly views</li><li>Check-offs and progress tracking</li></ul>
            <Link className="btn ghost" href="/signup">Start free</Link>
          </div>
          <div className="card tier">
            <h3>{PLANS.pro.name}</h3><div className="price">{money(PLANS.pro.priceCents)}</div>
            <ul><li>Unlimited to-do lists</li><li>Unlimited calendars</li><li>Everything in Basic</li></ul>
            <Link className="btn ghost" href="/signup">Get Pro</Link>
          </div>
          <div className="card tier featured">
            <h3>{PLANS.ai.name} ✨</h3><div className="price">{money(PLANS.ai.priceCents)}</div>
            <ul><li>AI planner: upload syllabuses, calendars and tasks</li><li>Schedules built around your life</li><li>Everything in Pro</li></ul>
            <Link className="btn" href="/signup">Get Nudge AI</Link>
          </div>
        </div>
      </section>

      <footer>
        <span>Built by <strong>Addison Frauenberg</strong> · Nudge, 2026</span>
        <span><Link href="/login">Log in</Link> · <Link href="/signup">Sign up</Link></span>
      </footer>
    </div>
  );
}
