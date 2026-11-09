import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { err, requireUser } from "@/lib/http";
import { PLANS, type Plan } from "@/lib/plans";

export async function POST(req: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const body = await req.json().catch(() => ({}));
  const plan = body.plan as Plan;
  if (plan !== "pro" && plan !== "ai") return err("Pick a plan.");
  if (!process.env.STRIPE_SECRET_KEY) return err("Payments aren't set up yet: STRIPE_SECRET_KEY is missing in Vercel.", 500);

  const origin = new URL(req.url).origin;
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    client_reference_id: String(user.id),
    metadata: { user_id: String(user.id), plan },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: PLANS[plan].priceCents,
          product_data: { name: `Nudge ${PLANS[plan].name}`, description: PLANS[plan].blurb },
        },
      },
    ],
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/dashboard?checkout=cancelled`,
  });
  return NextResponse.json({ url: session.url });
}
