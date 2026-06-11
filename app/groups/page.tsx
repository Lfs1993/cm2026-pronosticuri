"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageBanner } from "@/components/ui/page-banner";
import { supabase } from "@/lib/supabase";
import { FIXTURES } from "@/lib/fixtures";

// Coduri ISO pentru flagcdn.com
const FLAG_CODES: Record<string, string> = {
  "Mexico": "mx",
  "South Africa": "za",
  "South Korea": "kr",
  "Czechia": "cz",
  "Canada": "ca",
  "Bosnia and Herzegovina": "ba",
  "Qatar": "qa",
  "Switzerland": "ch",
  "Brazil": "br",
  "Morocco": "ma",
  "Haiti": "ht",
  "Scotland": "gb-sct",
  "USA": "us",
  "Paraguay": "py",
  "Australia": "au",
  "Türkiye": "tr",
  "Germany": "de",
  "Curaçao": "cw",
  "Côte d'Ivoire": "ci",
  "Ecuador": "ec",
  "Netherlands": "nl",
  "Japan": "jp",
  "Sweden": "se",
  "Tunisia": "tn",
  "Belgium": "be",
  "Egypt": "eg",
  "Iran": "ir",
  "New Zealand": "nz",
  "Spain": "es",
  "Cabo Verde": "cv",
  "Saudi Arabia": "sa",
  "Uruguay": "uy",
  "France": "fr",
  "Senegal": "sn",
  "Iraq": "iq",
  "Norway": "no",
  "Argentina": "ar",
  "Algeria": "dz",
  "Austria": "at",
  "Jordan": "jo",
  "Portugal": "pt",
  "DR Congo": "cd",
  "Uzbekistan": "uz",
  "Colombia": "co",
  "England": "gb-eng",
  "Croatia": "hr",
  "Ghana": "gh",
  "Panama": "pa",
};

function getFlagUrl(team: string): string {
  const code = FLAG_CODES[team];
  if (!code) return "";
  return `https://flagcdn.com/24x18/${code}.png`;
}

type MatchRow = { id: string; group_name: string | null; home_team: string; away_team: string; home_score: number | null; away_score: number | null; };
type TeamRow = { team: string; mp: number; w: number; d: number; l: number; gd: number; pts: number; };

function emptyRow(team: string): TeamRow { return { team, mp: 0, w: 0, d: 0, l: 0, gd: 0, pts: 0 }; }
function applyResult(row: TeamRow, gf: number, ga: number) { row.mp += 1; row.gd += gf - ga; if (gf > ga) { row.w += 1; row.pts += 3; } else if (gf === ga) { row.d += 1; row.pts += 1; } else { row.l += 1; } }

export default function GroupsCM2026Page() {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) { window.location.href = "/auth/login"; return; }
      const { data } = await supabase
        .from("matches")
        .select("id, group_name, home_team, away_team, home_score, away_score")
        .eq("stage", "groups")
        .order("order_index", { ascending: true });
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
    <main className="min-h-screen bg-[#071327]">
      <AppShell>
        <PageBanner src="/images/grupele.jpg" alt="Grupele CM 2026" title="Grupele CM 2026" subtitle="Clasamente + scoruri actualizate din Admin." />

        {loading ? (
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">Se încarcă...</div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">
            {letters.map((group) => (
              <div key={group} className="rounded-[30px] border border-[#d4af37]/25 bg-[#091a33] p-6 text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                <div className="mb-4">
                  <div className="text-sm uppercase tracking-[0.2em] text-white/55">World Cup</div>
                  <div className="text-2xl font-semibold text-fifa-gold">Group {group}</div>
                </div>

                <div className="grid grid-cols-[32px_1.9fr_repeat(6,44px)] items-center gap-2 border-b border-white/10 pb-2 text-xs font-semibold text-white/70">
                  <div></div><div>Team</div><div className="text-center">MP</div><div className="text-center">W</div><div className="text-center">D</div><div className="text-center">L</div><div className="text-center">GD</div><div className="text-center">Pts</div>
                </div>

                <div>
                  {grouped.standings[group].map((row, index) => {
                    const flagUrl = getFlagUrl(row.team);
                    return (
                      <div key={row.team} className="grid grid-cols-[32px_1.9fr_repeat(6,44px)] items-center gap-2 border-b border-white/5 py-3 last:border-b-0">
                        <div className="text-sm font-medium">{index + 1}</div>
                        <div className="flex items-center gap-2">
                          {flagUrl ? (
                            <img
                              src={flagUrl}
                              alt={row.team}
                              width={24}
                              height={18}
                              className="rounded-sm object-cover shrink-0"
                            />
                          ) : (
                            <span className="w-6 h-4 rounded-sm bg-white/20 shrink-0" />
                          )}
                          <span className="text-[15px] font-medium">{row.team}</span>
                        </div>
                        <div className="text-center text-sm">{row.mp}</div>
                        <div className="text-center text-sm">{row.w}</div>
                        <div className="text-center text-sm">{row.d}</div>
                        <div className="text-center text-sm">{row.l}</div>
                        <div className="text-center text-sm">{row.gd}</div>
                        <div className="text-center text-sm font-bold text-fifa-gold">{row.pts}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 rounded-[22px] border border-white/10 bg-white/5 p-4 text-sm">
                  <div className="mb-2 text-sm font-semibold text-white/75">Scoruri meciuri</div>
                  <div className="grid gap-2">
                    {(grouped.fixturesByGroup[group] || []).map((m) => {
                      const homeFlagUrl = getFlagUrl(m.home_team);
                      const awayFlagUrl = getFlagUrl(m.away_team);
                      return (
                        <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl bg-black/20 px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            {homeFlagUrl && <img src={homeFlagUrl} alt={m.home_team} width={20} height={15} className="rounded-sm" />}
                            <span>{m.home_team}</span>
                          </div>
                          <span className="font-semibold text-fifa-gold shrink-0">{m.home_score ?? "-"} : {m.away_score ?? "-"}</span>
                          <div className="flex items-center gap-1.5">
                            <span>{m.away_team}</span>
                            {awayFlagUrl && <img src={awayFlagUrl} alt={m.away_team} width={20} height={15} className="rounded-sm" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AppShell>
    </main>
  );
}
