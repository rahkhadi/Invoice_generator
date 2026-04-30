"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const googleMessage =
    searchParams.get("google") === "not-configured"
      ? "Google sign-in is ready to connect. Add Google OAuth credentials in .env, or use platform signup below for now."
      : searchParams.get("google") === "failed"
        ? "Google login failed. Try again or use platform login."
        : "";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "Invalid email or password.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <section className="flex min-h-screen items-center justify-center p-5">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-950">Contractor Login</h1>
        <p className="mt-1 text-sm text-slate-500">Use Google or your platform account to save company details for future invoices.</p>
        <a className="btn-secondary mt-5 w-full" href="/api/auth/google">Continue with Google</a>
        {googleMessage ? <p className="mt-3 rounded-md bg-orange-50 p-3 text-sm text-orange-900">{googleMessage}</p> : null}
        <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          Platform login
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <div className="mt-5 space-y-4">
          <div>
            <label>Email</label>
            <input className="mt-1 w-full" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@gmail.com" />
          </div>
          <div>
            <label>Password</label>
            <input className="mt-1 w-full" required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" />
          </div>
          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
          <button className="btn-primary w-full" type="submit">Sign in</button>
          <p className="text-center text-sm text-slate-500">
            No account yet? <Link className="font-semibold text-orange-600" href="/signup">Create one</Link>
          </p>
        </div>
      </form>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<section className="p-8 text-sm text-slate-500">Loading login...</section>}>
      <LoginForm />
    </Suspense>
  );
}
