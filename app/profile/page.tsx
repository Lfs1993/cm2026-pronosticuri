"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { supabase } from "@/lib/supabase";

export default function ProfilePage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [stats, setStats] = useState({ points: 0, exact: 0, outcomes: 0, played: 0 });

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) { window.location.href = "/auth/login"; return; }
      setEmail(user.email || "");
      const { data } = await supabase.from("profiles").select("display_name").eq("id", user.id).single();
      setDisplayName(data?.display_name || user.user_metadata?.display_name || "");
      const { data: board } = await supabase.rpc("leaderboard_view");
      const mine = (board || []).find((x: any) => x.user_id === user.id);
      if (mine) setStats({ points: Number(mine.points || 0), exact: Number(mine.exact_hits || 0), outcomes: Number(mine.outcome_hits || 0), played: Number(mine.counted_predictions || 0) });
    }
    load();
  }, []);

  async function save() {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) return;
    await supabase.from("profiles").update({ display_name: displayName }).eq("id", user.id);
    setMessage("Profilul a fost actualizat.");
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }

  return (
    <main style={{ backgroundImage: "linear-gradient(rgba(7,19,39,0.78), rgba(7,19,39,0.92)), url('/images/profil-worldcup.png')", backgroundSize: "cover", backgroundPosition: "center" }}>
      <AppShell>
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="card p-6 md:p-8">
            <h2 className="text-3xl font-bold">Profil</h2>
            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm text-white/70">Email</label>
                <input className="input" disabled value={email} />
              </div>
              <div>
                <label className="mb-2 block text-sm text-white/70">Numele afișat</label>
                <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
              {message ? <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">{message}</div> : null}
              <div className="flex gap-3">
                <button className="btn-primary" onClick={save}>Salvează profilul</button>
                <button className="btn-secondary" onClick={logout}>Logout</button>
              </div>
            </div>
          </div>

          <div className="card p-6 md:p-8">
            <h3 className="text-2xl font-bold">Statisticile tale live</h3>
            <div className="mt-6 grid gap-4">
              <div className="rounded-2xl bg-white/5 p-4"><div className="text-sm text-white/70">Puncte totale</div><div className="mt-1 text-3xl font-bold text-fifa-gold">{stats.points}</div></div>
              <div className="rounded-2xl bg-white/5 p-4"><div className="text-sm text-white/70">Scoruri exacte</div><div className="mt-1 text-3xl font-bold">{stats.exact}</div></div>
              <div className="rounded-2xl bg-white/5 p-4"><div className="text-sm text-white/70">Rezultate corecte</div><div className="mt-1 text-3xl font-bold">{stats.outcomes}</div></div>
              <div className="rounded-2xl bg-white/5 p-4"><div className="text-sm text-white/70">Meciuri punctate</div><div className="mt-1 text-3xl font-bold">{stats.played}</div></div>
            </div>
          </div>
        </div>
      </AppShell>
    </main>
  );
}