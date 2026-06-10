"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });

    if (error) setError(error.message);
    else setMessage("Ți-am trimis emailul de resetare.");
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#071327] px-4 py-10 text-white md:px-8">
      <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
        <div className="text-xs uppercase tracking-[0.35em] text-fifa-gold">Recuperare parolă</div>
        <h1 className="mt-3 text-3xl font-bold">Resetare parolă</h1>
        <p className="mt-3 text-white/70">Introdu emailul contului și primești link de resetare.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm text-white/70">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          {message ? <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">{message}</div> : null}
          {error ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-100">{error}</div> : null}
          <div className="flex gap-3">
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Se trimite..." : "Trimite email"}</button>
            <Link href="/auth/login" className="btn-secondary">Înapoi la login</Link>
          </div>
        </form>
      </div>
    </main>
  );
}