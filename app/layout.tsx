import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nudge – AI planner for students",
  description:
    "Nudge turns your syllabuses, calendars and to-dos into a day-by-day plan, with daily, weekly and monthly lists and calendars so every task gets done on time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
