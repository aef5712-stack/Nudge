export type Plan = "free" | "pro" | "ai";

export const PLANS: Record<Plan, { name: string; priceCents: number; maxLists: number; ai: boolean; blurb: string }> = {
  free: { name: "Basic", priceCents: 0, maxLists: 3, ai: false, blurb: "Up to 3 to-do lists with daily, weekly and monthly views." },
  pro: { name: "Pro", priceCents: 499, maxLists: Infinity, ai: false, blurb: "Unlimited lists and calendars." },
  ai: { name: "Nudge AI", priceCents: 999, maxLists: Infinity, ai: true, blurb: "Everything in Pro, plus the AI planner." },
};

export function planOf(p: string): Plan {
  return p === "pro" || p === "ai" ? p : "free";
}

export function money(cents: number) {
  return cents === 0 ? "Free" : `$${(cents / 100).toFixed(2)}`;
}
