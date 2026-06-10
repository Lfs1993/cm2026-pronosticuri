"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    const { error } = await supabase.auth.updateUser({ password });
    if (error) setError(error.message);
    else setMessage("Parola a fost schimbată. Acum te poți loga.");
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#071327] px-4 py-10 text-white md:px-8">
      <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
        <div className="text-xs uppercase tracking-[0.35em] text-fifa-gold">Parolă nouă</div>
        <h1 className="mt-3 text-3xl font-bold">Setează parola nouă</h1>
        <p className="mt-3 text-white/70">Introdu parola nouă și salvează.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm text-white/70">Parolă nouă</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          {message ? <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">{message}</div> : null}
          {error ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-100">{error}</div> : null}
          <div className="flex gap-3">
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Se salvează..." : "Salvează parola"}</button>
            <Link href="/auth/login" className="btn-secondary">Login</Link>
          </div>
        </form>
      </div>
    </main>
  );
}