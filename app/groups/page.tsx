"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { supabase } from "@/lib/supabase";
import { FIXTURES } from "@/lib/fixtures";

const FLAGS: Record<string, string> = {
  "Mexico": "🇲🇽", "South Africa": "🇿🇦", "South Korea": "🇰🇷", "Czechia": "🇨🇿",
  "Canada": "🇨🇦", "Bosnia and Herzegovina": "🇧🇦", "Qatar": "🇶🇦", "Switzerland": "🇨🇭",
  "Brazil": "🇧🇷", "Morocco": "🇲🇦", "Haiti": "🇭🇹", "Scotland": "🏴",
  "USA": "🇺🇸", "Paraguay": "🇵🇾", "Australia": "🇦🇺", "Türkiye": "🇹🇷",
  "Germany": "🇩🇪", "Curaçao": "🇨🇼", "Côte d'Ivoire": "🇨🇮", "Ecuador": "🇪🇨",
  "Netherlands": "🇳🇱", "Japan": "🇯🇵", "Sweden": "🇸🇪", "Tunisia": "🇹🇳",
  "Belgium": "🇧🇪", "Egypt": "🇪🇬", "Iran": "🇮🇷", "New Zealand": "🇳🇿",
  "Spain": "🇪🇸", "Cabo Verde": "🇨🇻", "Saudi Arabia": "🇸🇦", "Uruguay": "🇺🇾",
  "France": "🇫🇷", "Senegal": "🇸🇳", "Iraq": "🇮🇶", "Norway": "🇳🇴",
  "Argentina": "🇦🇷", "Algeria": "🇩🇿", "Austria": "🇦🇹", "Jordan": "🇯🇴",
  "Portugal": "🇵🇹", "DR Congo": "🇨🇩", "Uzbekistan": "🇺🇿", "Colombia": "🇨🇴",
  "England": "🏴", "Croatia": "🇭🇷", "Ghana": "🇬🇭", "Panama": "🇵🇦",
};

type MatchRow = { id: string; group_name: string | null; home_team: string; away_team: string; home_score: number | null; away_score: number | null; };
type TeamRow = { team: string; flag: string; mp: number; w: number; d: number; l: number; gd: number; pts: number; };

function emptyRow(team: string): TeamRow { return { team, flag: FLAGS[team] ?? "🏳️", mp: 0, w: 0, d: 0, l: 0, gd: 0, pts: 0 }; }
function applyResult(row: TeamRow, gf: number, ga: number) { row.mp += 1; row.gd += gf - ga; if (gf > ga) { row.w += 1; row.pts += 3; } else if (gf === ga) { row.d += 1; row.pts += 1; } else { row.l += 1; } }

export default function GroupsCM2026Page() {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) { window.location.href = "/auth/login"; return; }
      const { data } = await supabase.from("matches").select("id, group_name, home_team, away_team, home_score, away_score").eq("stage", "groups").order("order_index", { ascending: true });
      setMatches((data || []) as MatchRow[]);
      setLoading(false);
    }
    load();
  }, []);

  const grouped = useMemo(() => {
    const teamsByGroup: Record<string, string[]> = {};
    const fixturesByGroup: Record<string, MatchRow[]> = {};
    for (const f of FIXTURES) {
      if ((f as any).stage !== "groups" || !(f as any).group_name) continue;
      const g = (f as any).group_name as string;
      teamsByGroup[g] ??= [];
      if (!teamsByGroup[g].includes((f as any).home_team)) teamsByGroup[g].push((f as any).home_team);
      if (!teamsByGroup[g].includes((f as any).away_team)) teamsByGroup[g].push((f as any).away_team);
    }
    for (const m of matches) {
      if (!m.group_name) continue;
      fixturesByGroup[m.group_name] ??= [];
      fixturesByGroup[m.group_name].push(m);
    }
    const standings: Record<string, TeamRow[]> = {};
    for (const g of Object.keys(teamsByGroup)) standings[g] = teamsByGroup[g].map(emptyRow);
    for (const m of matches) {
      if (!m.group_name || m.home_score === null || m.away_score === null) continue;
      const home = standings[m.group_name].find((t) => t.team === m.home_team);
      const away = standings[m.group_name].find((t) => t.team === m.away_team);
      if (!home || !away) continue;
      applyResult(home, m.home_score, m.away_score);
      applyResult(away, m.away_score, m.home_score);
    }
    for (const g of Object.keys(standings)) standings[g].sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.w - a.w || a.team.localeCompare(b.team));
    return { standings, fixturesByGroup };
  }, [matches]);

  const letters = useMemo(() => Object.keys(grouped.standings).sort(), [grouped]);

  return (
    <main style={{ backgroundImage: "linear-gradient(rgba(7,19,39,0.45), rgba(7,19,39,0.72)), url('/images/grupele-reference.jpg')", backgroundSize: "cover", backgroundPosition: "center top" }}>
      <AppShell>
        <section className="card p-6 md:p-8">
          <h2 className="text-3xl font-bold">Grupele CM 2026</h2>
          <p className="mt-2 text-white/80">Clasamente + scoruri actualizate din Admin.</p>
        </section>

        {loading ? <div className="mt-6 card p-6">Se încarcă...</div> : (
          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            {letters.map((group) => (
              <div key={group} className="rounded-[28px] bg-white/95 text-slate-900 p-6 shadow-sm">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <div className="text-sm text-slate-500">World Cup</div>
                    <div className="text-xl font-semibold">Group {group}</div>
                  </div>
                </div>

                <div className="grid grid-cols-[28px_1.8fr_repeat(6,44px)] items-center gap-2 border-b border-slate-200 pb-2 text-xs font-semibold text-slate-600">
                  <div></div><div>Team</div><div className="text-center">MP</div><div className="text-center">W</div><div className="text-center">D</div><div className="text-center">L</div><div className="text-center">GD</div><div className="text-center font-bold">Pts</div>
                </div>

                <div>
                  {grouped.standings[group].map((row, index) => (
                    <div key={row.team} className="grid grid-cols-[28px_1.8fr_repeat(6,44px)] items-center gap-2 border-b border-slate-100 py-3 last:border-b-0">
                      <div className="text-sm font-medium">{index + 1}</div>
                      <div className="flex items-center gap-3 min-w-0"><span className="text-lg">{row.flag}</span><span className="text-[15px] font-medium">{row.team}</span></div>
                      <div className="text-center text-sm">{row.mp}</div><div className="text-center text-sm">{row.w}</div><div className="text-center text-sm">{row.d}</div><div className="text-center text-sm">{row.l}</div><div className="text-center text-sm">{row.gd}</div><div className="text-center text-sm font-bold">{row.pts}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-2 rounded-2xl bg-slate-100 p-4 text-sm">
                  {(grouped.fixturesByGroup[group] || []).map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-3">
                      <span>{m.home_team} - {m.away_team}</span>
                      <span className="font-semibold">{m.home_score ?? "-"} : {m.away_score ?? "-"}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </AppShell>
    </main>
  );
}