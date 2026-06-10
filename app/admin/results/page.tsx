"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { supabase } from "@/lib/supabase";
import { FIXTURES } from "@/lib/fixtures";

const LABELS: Record<string, string> = {
  groups1: "Etapa 1",
  groups2: "Etapa 2",
  groups3: "Etapa 3",
  round32: "32-imi",
  round16: "Optimi",
  quarter: "Sferturi",
  semi: "Semifinale",
  third: "Finala mică",
  final: "Finala",
};

export default function AdminResultsPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [scores, setScores] = useState<Record<string, { home: string; away: string }>>({});

  const grouped = useMemo(() => {
    const all = FIXTURES as any[];
    return {
      groups1: all.filter((m) => m.stage === "groups" && m.matchday === 1).sort((a, b) => (a.group_name || "").localeCompare(b.group_name || "")),
      groups2: all.filter((m) => m.stage === "groups" && m.matchday === 2).sort((a, b) => (a.group_name || "").localeCompare(b.group_name || "")),
      groups3: all.filter((m) => m.stage === "groups" && m.matchday === 3).sort((a, b) => (a.group_name || "").localeCompare(b.group_name || "")),
      round32: all.filter((m) => m.stage === "round32"),
      round16: all.filter((m) => m.stage === "round16"),
      quarter: all.filter((m) => m.stage === "quarter"),
      semi: all.filter((m) => m.stage === "semi"),
      third: all.filter((m) => m.stage === "third"),
      final: all.filter((m) => m.stage === "final"),
    };
  }, []);

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) { window.location.href = "/auth/login"; return; }
      const { data } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
      if (!data?.is_admin) return;
      setIsAdmin(true);
      const { data: matchesData } = await supabase.from("matches").select("id, home_score, away_score");
      const map: Record<string, { home: string; away: string }> = {};
      (matchesData || []).forEach((m: any) => { map[m.id] = { home: m.home_score?.toString() ?? "", away: m.away_score?.toString() ?? "" }; });
      setScores(map);
    }
    load();
  }, []);

  async function save(matchId: string) {
    const value = scores[matchId];
    await supabase.from("matches").update({ home_score: value.home === "" ? null : Number(value.home), away_score: value.away === "" ? null : Number(value.away), is_finished: value.home !== "" && value.away !== "" }).eq("id", matchId);
    alert("Rezultatul a fost salvat.");
  }

  function renderBlock(key: keyof typeof grouped) {
    if (!grouped[key].length) return null;
    return (
      <section className="mt-6">
        <div className="card p-6 md:p-8"><h3 className="text-2xl font-bold">{LABELS[key]}</h3></div>
        <div className="mt-4 grid gap-4">
          {grouped[key].map((match: any) => (
            <div key={match.id} className="card p-4">
              <div className="font-semibold">{match.home_team} vs {match.away_team}</div>
              <div className="mt-1 text-sm text-white/60">{match.stage === "groups" ? `Grupa ${match.group_name}` : LABELS[match.stage]}</div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <input className="input max-w-[90px] text-center" type="number" min="0" value={scores[match.id]?.home ?? ""} onChange={(e) => setScores((prev) => ({ ...prev, [match.id]: { home: e.target.value, away: prev[match.id]?.away ?? "" } }))} />
                <span>-</span>
                <input className="input max-w-[90px] text-center" type="number" min="0" value={scores[match.id]?.away ?? ""} onChange={(e) => setScores((prev) => ({ ...prev, [match.id]: { home: prev[match.id]?.home ?? "", away: e.target.value } }))} />
                <button className="btn-primary" onClick={() => save(match.id)}>Salvează rezultat</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!isAdmin) {
    return <main style={{ backgroundImage: "linear-gradient(rgba(7,19,39,0.80), rgba(7,19,39,0.92)), url('/images/clasament.webp')", backgroundSize: "cover", backgroundPosition: "center" }}><AppShell><div className="card p-8 text-lg">Doar adminul poate modifica rezultatele.</div></AppShell></main>;
  }

  return (
    <main style={{ backgroundImage: "linear-gradient(rgba(7,19,39,0.80), rgba(7,19,39,0.92)), url('/images/clasament.webp')", backgroundSize: "cover", backgroundPosition: "center" }}>
      <AppShell>
        <section className="card p-6 md:p-8">
          <h2 className="text-3xl font-bold">Admin</h2>
          <p className="mt-2 text-white/70">Rezultatele sunt separate pe etape și pe faze eliminatorii.</p>
        </section>
        {renderBlock("groups1")}
        {renderBlock("groups2")}
        {renderBlock("groups3")}
        {renderBlock("round32")}
        {renderBlock("round16")}
        {renderBlock("quarter")}
        {renderBlock("semi")}
        {renderBlock("third")}
        {renderBlock("final")}
      </AppShell>
    </main>
  );
}