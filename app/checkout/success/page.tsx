import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { PLANS, planOf } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function Success({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const user = await getUser();
  if (!user) redirect("/login");
  const { session_id } = await searchParams;

  let message = "We couldn't confirm that payment.";
  let ok = false;
  if (session_id) {
    // Ask Stripe directly whether this checkout was paid, so nobody can fake it from the browser.
    const s = await stripe().checkout.sessions.retrieve(session_id);
    if (s.payment_status === "paid" && s.metadata?.user_id === String(user.id)) {
      const plan = planOf(s.metadata.plan ?? "") === "ai" ? "ai" : "pro";
      const sql = await db();
      await sql`
        INSERT INTO payments (stripe_session_id, user_id, plan, amount_cents)
        VALUES (${s.id}, ${user.id}, ${plan}, ${s.amount_total ?? 0}) ON CONFLICT DO NOTHING`;
      // Never downgrade: AI includes everything in Pro.
      await sql`UPDATE users SET plan = ${plan} WHERE id = ${user.id} AND plan <> 'ai'`;
      ok = true;
      message = `You're on ${PLANS[plan].name}. ${PLANS[plan].blurb}`;
    }
  }

  return (
    <main className="auth">
      <div className="auth-card">
        <Link href="/" className="logo">nudge<span>.</span></Link>
        <h1>{ok ? "Payment complete 🎉" : "Hmm…"}</h1>
        <p className="muted">{message}</p>
        <Link className="btn" href="/dashboard">Go to my dashboard</Link>
      </div>
    </main>
  );
}
