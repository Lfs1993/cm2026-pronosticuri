"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageBanner } from "@/components/ui/page-banner";
import { supabase } from "@/lib/supabase";

export default function LeaderboardPage() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { async function load(){ const { data } = await supabase.rpc("leaderboard_view"); setRows(data || []); } load(); }, []);
  const prepared = useMemo(() => rows.map((r, i) => ({ ...r, played: Number(r.counted_predictions || 0), pos: i + 1 })), [rows]);

  return (
    <main className="min-h-screen bg-[#071327]">
      <AppShell>
        <PageBanner src="/images/clasament.webp" alt="Clasament Blyats CM 2026" title="Clasament Blyats CM 2026" subtitle="3 puncte pentru scor corect. 1 punct pentru rezultat corect." />
        <div className="overflow-x-auto rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm">
          <table className="min-w-full text-left text-white">
            <thead className="border-b border-white/10 bg-white/5 text-sm uppercase tracking-wide text-white/70"><tr><th className="px-4 py-4">Loc</th><th className="px-4 py-4">User</th><th className="px-4 py-4">Jucate</th><th className="px-4 py-4">Puncte</th><th className="px-4 py-4">Scoruri exacte</th><th className="px-4 py-4">Rezultate corecte</th></tr></thead>
            <tbody>{prepared.map((row) => <tr key={row.user_id} className="border-b border-white/10 last:border-b-0"><td className="px-4 py-4 font-bold text-fifa-gold">{row.pos}</td><td className="px-4 py-4 font-semibold">{row.display_name}</td><td className="px-4 py-4">{row.played}</td><td className="px-4 py-4 font-bold">{row.points}</td><td className="px-4 py-4">{row.exact_hits}</td><td className="px-4 py-4">{row.outcome_hits}</td></tr>)}</tbody>
          </table>
        </div>
      </AppShell>
    </main>
  );
}