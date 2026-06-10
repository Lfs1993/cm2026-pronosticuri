"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { supabase } from "@/lib/supabase";
export default function LeaderboardPage() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { async function load() { const { data } = await supabase.rpc("leaderboard_view"); setRows(data || []); } load(); }, []);
  return <AppShell><section className="card p-6 md:p-8"><h2 className="text-3xl font-bold">Clasament</h2><p className="mt-2 text-white/70">3 puncte pentru scor exact, 1 punct pentru rezultat corect.</p></section><div className="mt-6 grid gap-3">{rows.map((row, index) => <div key={row.user_id} className="card grid grid-cols-[60px_1fr_120px_120px_120px] items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-fifa-gold font-bold text-black">{index + 1}</div><div><div className="font-semibold">{row.display_name}</div><div className="text-sm text-white/60">Pronosticuri punctate: {row.counted_predictions}</div></div><div><div className="text-sm text-white/60">Puncte</div><div className="text-2xl font-bold text-fifa-gold">{row.points}</div></div><div><div className="text-sm text-white/60">Scor exact</div><div className="text-2xl font-bold">{row.exact_hits}</div></div><div><div className="text-sm text-white/60">Rezultat</div><div className="text-2xl font-bold">{row.outcome_hits}</div></div></div>)}</div></AppShell>;
}