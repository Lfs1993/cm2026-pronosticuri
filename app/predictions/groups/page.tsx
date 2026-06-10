"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { MatchCard } from "@/components/cards";
import { supabase } from "@/lib/supabase";
import { FIXTURES } from "@/lib/fixtures";

export default function GroupPredictionsByMatchdayPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, { home: string; away: string }>>({});

  const matchesByMatchday = useMemo(() => {
    const all = FIXTURES.filter((m: any) => m.stage === "groups");
    return {
      1: all.filter((m: any) => m.matchday === 1).sort((a: any, b: any) => (a.group_name || "").localeCompare(b.group_name || "")),
      2: all.filter((m: any) => m.matchday === 2).sort((a: any, b: any) => (a.group_name || "").localeCompare(b.group_name || "")),
      3: all.filter((m: any) => m.matchday === 3).sort((a: any, b: any) => (a.group_name || "").localeCompare(b.group_name || "")),
    };
  }, []);

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) { window.location.href = "/auth/login"; return; }
      setUserId(user.id);
      const { data } = await supabase.from("predictions").select("match_id, predicted_home, predicted_away").eq("user_id", user.id);
      const map: Record<string, { home: string; away: string }> = {};
      (data || []).forEach((p: any) => { map[p.match_id] = { home: String(p.predicted_home), away: String(p.predicted_away) }; });
      setValues(map);
    }
    load();
  }, []);

  async function save(match: any) {
    if (!userId) return;
    const current = values[match.id];
    if (!current || current.home === "" || current.away === "") return;
    await supabase.from("predictions").upsert({ user_id: userId, match_id: match.id, predicted_home: Number(current.home), predicted_away: Number(current.away) }, { onConflict: "user_id,match_id" });
    alert("Pronosticul a fost salvat.");
  }

  function renderSection(matchday: 1 | 2 | 3) {
    return (
      <section className="mt-6">
        <div className="card p-6 md:p-8"><h3 className="text-2xl font-bold">Etapa {matchday}</h3></div>
        <div className="mt-4 grid gap-4">
          {matchesByMatchday[matchday].map((match: any) => (
            <MatchCard key={match.id} match={match as any}>
              <div className="flex flex-wrap items-center gap-3">
                <input className="input max-w-[90px] text-center" type="number" min="0" value={values[match.id]?.home ?? ""} onChange={(e) => setValues((prev) => ({ ...prev, [match.id]: { home: e.target.value, away: prev[match.id]?.away ?? "" } }))} />
                <span>-</span>
                <input className="input max-w-[90px] text-center" type="number" min="0" value={values[match.id]?.away ?? ""} onChange={(e) => setValues((prev) => ({ ...prev, [match.id]: { home: prev[match.id]?.home ?? "", away: e.target.value } }))} />
                <button className="btn-primary" onClick={() => save(match)} disabled={new Date(match.lock_at) <= new Date()}>Salvează</button>
                <span className="text-sm text-white/50">Grupa {match.group_name}</span>
              </div>
            </MatchCard>
          ))}
        </div>
      </section>
    );
  }

  return (
    <main style={{ backgroundImage: "linear-gradient(rgba(7,19,39,0.58), rgba(7,19,39,0.88)), url('/images/pronosticuri.jpeg')", backgroundSize: "cover", backgroundPosition: "center" }}>
      <AppShell>
        <section className="card p-6 md:p-8"><h2 className="text-3xl font-bold">Pronosticuri Grupe</h2></section>
        {renderSection(1)}{renderSection(2)}{renderSection(3)}
      </AppShell>
    </main>
  );
}