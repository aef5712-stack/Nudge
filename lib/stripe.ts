import Stripe from "stripe";

// STRIPE_SECRET_KEY lives in Vercel's environment variables, never in the code.
export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set in Vercel.");
  return new Stripe(key);
}
