"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "Could not create account.");
      return;
    }
    router.push("/profile");
  }

  return (
    <section className="flex min-h-screen items-center justify-center p-5">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-950">Create Account</h1>
        <p className="mt-1 text-sm text-slate-500">Create a platform account, then save your company profile once.</p>
        <a className="btn-secondary mt-5 w-full" href="/api/auth/google">Sign up with Google</a>
        <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          Platform signup
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <div className="space-y-4">
          <div>
            <label>Name</label>
            <input className="mt-1 w-full" required value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div>
            <label>Email</label>
            <input className="mt-1 w-full" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div>
            <label>Password</label>
            <input className="mt-1 w-full" required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
          <button className="btn-primary w-full" type="submit">Create account</button>
          <p className="text-center text-sm text-slate-500">
            Already have an account? <Link className="font-semibold text-orange-600" href="/login">Sign in</Link>
          </p>
        </div>
      </form>
    </section>
  );
}
