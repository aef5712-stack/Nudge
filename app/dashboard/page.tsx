import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PLANS } from "@/lib/plans";
import Dashboard from "./Dashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "My plan – Nudge" };

export default async function Page() {
  const user = await getUser();
  if (!user) redirect("/login");
  const sql = await db();
  const lists = await sql`SELECT id, name, color FROM lists WHERE user_id = ${user.id} ORDER BY id`;
  const plan = PLANS[user.plan];
  return (
    <Dashboard
      user={{ name: user.name, email: user.email, plan: user.plan, planName: plan.name, ai: plan.ai, maxLists: Number.isFinite(plan.maxLists) ? plan.maxLists : null }}
      initialLists={lists.map((l) => ({ id: l.id as number, name: l.name as string, color: l.color as string }))}
    />
  );
}
