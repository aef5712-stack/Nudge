# Nudge

AI planner and habit tracker. Upload syllabuses, calendars and to-dos; Nudge builds a day-by-day schedule.
Built by Addison Frauenberg.

- **Next.js** app deployed on Vercel
- **Neon Postgres** for accounts, lists and tasks (tables are created automatically on first request)
- **Claude API** for the AI planner (`app/api/ai/plan`)
- **Stripe Checkout** for upgrades (`app/api/checkout`)

## Environment variables (set in Vercel, never in code)

| Name | Where it comes from |
|---|---|
| `DATABASE_URL` | Added automatically when you connect Neon in Vercel → Storage |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `STRIPE_SECRET_KEY` | dashboard.stripe.com → Developers → API keys (test key starts with `sk_test_`) |

Demo account: `demo@demo.com` / `password123!` (created automatically, full AI access).
