"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { supabase } from "@/lib/supabase";
import { FIXTURES } from "@/lib/fixtures";

const FLAG_CODES: Record<string, string> = {
  "Mexico": "mx","South Africa": "za","South Korea": "kr","Czechia": "cz",
  "Canada": "ca","Bosnia and Herzegovina": "ba","Qatar": "qa","Switzerland": "ch",
  "Brazil": "br","Morocco": "ma","Haiti": "ht","Scotland": "gb-sct",
  "USA": "us","Paraguay": "py","Australia": "au","Türkiye": "tr",
  "Germany": "de","Curaçao": "cw","Côte d'Ivoire": "ci","Ecuador": "ec",
  "Netherlands": "nl","Japan": "jp","Sweden": "se","Tunisia": "tn",
  "Belgium": "be","Egypt": "eg","Iran": "ir","New Zealand": "nz",
  "Spain": "es","Cabo Verde": "cv","Saudi Arabia": "sa","Uruguay": "uy",
  "France": "fr","Senegal": "sn","Iraq": "iq","Norway": "no",
  "Argentina": "ar","Algeria": "dz","Austria": "at","Jordan": "jo",
  "Portugal": "pt","DR Congo": "cd","Uzbekistan": "uz","Colombia": "co",
  "England": "gb-eng","Croatia": "hr","Ghana": "gh","Panama": "pa",
};

function getFlagUrl(team: string): string {
  const code = FLAG_CODES[team];
  return code ? `https://flagcdn.com/24x18/${code}.png` : "";
}

type MatchRow = {
  id: string;
  group_name: string | null;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
};

type TeamRow = {
  team: string;
  mp: number;
  w: number;
  d: number;
  l: number;
  gd: number;
  pts: number;
};

function emptyRow(team: string): TeamRow {
  return { team, mp: 0, w: 0, d: 0, l: 0, gd: 0, pts: 0 };
}

function applyResult(row: TeamRow, gf: number, ga: number) {
  row.mp++;
  row.gd += gf - ga;
  if (gf > ga) { row.w++; row.pts += 3; }
  else if (gf === ga) { row.d++; row.pts += 1; }
  else { row.l++; }
}

export default function GroupsCM2026Page() {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        window.location.href = "/auth/login";
        return;
      }

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
      if (!teamsByGroup[g].includes((f as any).home_team))
        teamsByGroup[g].push((f as any).home_team);
      if (!teamsByGroup[g].includes((f as any).away_team))
        teamsByGroup[g].push((f as any).away_team);
    }

    for (const m of matches) {
      if (!m.group_name) continue;
      (fixturesByGroup[m.group_name] ??= []).push(m);
    }

    const standings: Record<string, TeamRow[]> = {};
    for (const g of Object.keys(teamsByGroup))
      standings[g] = teamsByGroup[g].map(emptyRow);

    for (const m of matches) {
      if (!m.group_name || m.home_score == null || m.away_score == null) continue;
      const home = standings[m.group_name].find(t => t.team === m.home_team);
      const away = standings[m.group_name].find(t => t.team === m.away_team);
      if (!home || !away) continue;

      applyResult(home, m.home_score, m.away_score);
      applyResult(away, m.away_score, m.home_score);
    }

    for (const g of Object.keys(standings)) {
      standings[g].sort(
        (a, b) =>
          b.pts - a.pts ||
          b.gd - a.gd ||
          b.w - a.w ||
          a.team.localeCompare(b.team)
      );
    }

    return { standings, fixturesByGroup };
  }, [matches]);

  const letters = useMemo(
    () => Object.keys(grouped.standings).sort(),
    [grouped]
  );

  return (
    <main className="min-h-screen bg-[#071327]">
      <AppShell>

        {/* ✅ BANNER MODIFICAT */}
        <section className="mb-6 overflow-hidden rounded-[32px] border border-white/10 bg-black/20 shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
          <div className="relative w-full bg-[#071327]" style={{ minHeight: '420px' }}>
            
            <div className="flex w-full h-[500px] overflow-hidden">

              <div
                className="flex-1 opacity-90"
                style={{
                  backgroundImage: "url('/images/grupele.jpg')",
                  backgroundSize: "cover",
                  backgroundPosition: "left center",
                  WebkitMaskImage: "linear-gradient(to right, transparent, black)"
                }}
              />

              <div
                className="w-[360px] shrink-0 z-10"
                style={{
                  backgroundImage: "url('/images/grupele.jpg')",
                  backgroundSize: "cover",
                  backgroundPosition: "center center"
                }}
              />

              <div
                className="flex-1 opacity-90"
                style={{
                  backgroundImage: "url('/images/grupele.jpg')",
                  backgroundSize: "cover",
                  backgroundPosition: "right center",
                  WebkitMaskImage: "linear-gradient(to left, transparent, black)"
                }}
              />
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-[#071327]/80 via-transparent to-transparent" />

            <div className="absolute bottom-6 left-0 right-0 text-center">
              <h2 className="text-3xl font-bold text-white">Grupele CM 2026</h2>
              <p className="text-white/70 text-sm">
                Clasamente + scoruri actualizate din Admin.
              </p>
            </div>
          </div>
        </section>

        {/* RESTUL codului (NESCHIMBAT) */}
        {loading ? (
          <div className="p-6">Se încarcă...</div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">
            {letters.map((group) => (
              <div key={group} className="p-6 bg-[#091a33] rounded-[30px]">
                <div className="mb-4">
                  <div className="text-sm text-white/55">World Cup</div>
                  <div className="text-2xl text-yellow-400">
                    Group {group}
                  </div>
                </div>

                {grouped.standings[group].map((row) => (
                  <div key={row.team}>{row.team}</div>
                ))}
              </div>
            ))}
          </div>
        )}
      </AppShell>
    </main>
  );
}
