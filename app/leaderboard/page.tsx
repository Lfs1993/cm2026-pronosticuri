"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { supabase } from "@/lib/supabase";

export default function LeaderboardPage() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.rpc("leaderboard_view");
      setRows(data || []);
    }
    load();
  }, []);

  const prepared = useMemo(() => rows.map((r, i) => ({ ...r, played: Number(r.counted_predictions || 0), pos: i + 1 })), [rows]);

  return (
    <main style={{ backgroundImage: "linear-gradient(rgba(7,19,39,0.80), rgba(7,19,39,0.92)), url('/images/clasament.webp')", backgroundSize: "cover", backgroundPosition: "center" }}>
      <AppShell>
        <section className="card p-6 md:p-8">
          <h2 className="text-3xl font-bold">Clasament Blyats CM 2026</h2>
          <div className="mt-3 text-white/80">
            <div>- 3 puncte pentru scor corect</div>
            <div>- 1 punct pentru rezultat corect</div>
          </div>
        </section>

        <div className="mt-6 overflow-x-auto rounded-3xl border border-white/10 bg-black/25 backdrop-blur">
          <table className="min-w-full text-left text-white">
            <thead className="border-b border-white/10 bg-white/5 text-sm uppercase tracking-wide text-white/70">
              <tr>
                <th className="px-4 py-4">Loc</th>
                <th className="px-4 py-4">User</th>
                <th className="px-4 py-4">Jucate</th>
                <th className="px-4 py-4">Puncte</th>
                <th className="px-4 py-4">Scoruri exacte</th>
                <th className="px-4 py-4">Rezultate corecte</th>
              </tr>
            </thead>
            <tbody>
              {prepared.map((row) => (
                <tr key={row.user_id} className="border-b border-white/10 last:border-b-0">
                  <td className="px-4 py-4 font-bold text-fifa-gold">{row.pos}</td>
                  <td className="px-4 py-4 font-semibold">{row.display_name}</td>
                  <td className="px-4 py-4">{row.played}</td>
                  <td className="px-4 py-4 font-bold">{row.points}</td>
                  <td className="px-4 py-4">{row.exact_hits}</td>
                  <td className="px-4 py-4">{row.outcome_hits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AppShell>
    </main>
  );
}