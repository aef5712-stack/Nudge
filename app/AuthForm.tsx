"use client";
import Link from "next/link";
import { useState } from "react";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const signup = mode === "signup";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = Object.fromEntries(new FormData(e.currentTarget));
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      window.location.href = "/dashboard";
    } else {
      setError(data.error || "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <form className="auth-card" onSubmit={submit}>
        <Link href="/" className="logo">nudge<span>.</span></Link>
        <h1>{signup ? "Create your account" : "Welcome back"}</h1>
        <p className="muted small">
          {signup ? "Free forever on Basic. Upgrade any time." : "Log in to see your lists and calendar."}
        </p>
        {signup && (
          <>
            <label htmlFor="name">Name</label>
            <input id="name" name="name" autoComplete="name" required />
          </>
        )}
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        <label htmlFor="password">Password</label>
        <input
          id="password" name="password" type="password" required
          minLength={signup ? 8 : undefined}
          autoComplete={signup ? "new-password" : "current-password"}
        />
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn" disabled={busy}>{busy ? "One sec…" : signup ? "Create account" : "Log in"}</button>
        <p className="small muted" style={{ textAlign: "center", marginTop: 16 }}>
          {signup ? <>Already have an account? <Link href="/login">Log in</Link></> : <>New to Nudge? <Link href="/signup">Create an account</Link></>}
        </p>
        {!signup && (
          <div className="demo-hint">Just looking? Log in with <strong>demo@demo.com</strong> / <strong>password123!</strong></div>
        )}
      </form>
    </main>
  );
}
