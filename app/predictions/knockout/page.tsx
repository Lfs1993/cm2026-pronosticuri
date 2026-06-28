"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useActivePhase } from "@/lib/useActivePhase";

type Match = {
  id: string;
  stage: string;
  group_name: string | null;
  matchday: number | null;
  order_index: number;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  is_finished: boolean;
};

type PredictionMap = Record<string, { home: string; away: string }>;

type Standing = {
  team: string;
  group: string;
  pts: number;
  gf: number;
  ga: number;
  gd: number;
  wins: number;
};

const KNOCKOUT_STAGES = [
  { key: "round32", label: "Șaisprezecimi" },
  { key: "round16", label: "Optimi de finală" },
  { key: "quarter", label: "Sferturi de finală" },
  { key: "semi", label: "Semifinale" },
  { key: "third", label: "Finala mică" },
  { key: "final", label: "Finala" },
];

function emptyStanding(team: string, group: string): Standing {
  return { team, group, pts: 0, gf: 0, ga: 0, gd: 0, wins: 0 };
}

function addResult(row: Standing, gf: number, ga: number) {
  row.gf += gf;
  row.ga += ga;
  row.gd += gf - ga;

  if (gf > ga) {
    row.pts += 3;
    row.wins += 1;
  } else if (gf === ga) {
    row.pts += 1;
  }
}

function buildStandings(matches: Match[]) {
  const standings: Record<string, Standing[]> = {};

  matches
    .filter((m) => m.stage === "groups" && m.group_name)
    .forEach((m) => {
      const group = m.group_name as string;
      standings[group] ??= [];

      if (!standings[group].some((t) => t.team === m.home_team)) {
        standings[group].push(emptyStanding(m.home_team, group));
      }

      if (!standings[group].some((t) => t.team === m.away_team)) {
        standings[group].push(emptyStanding(m.away_team, group));
      }
    });

  matches
    .filter(
      (m) =>
        m.stage === "groups" &&
        m.group_name &&
        m.is_finished &&
        m.home_score !== null &&
        m.away_score !== null
    )
    .forEach((m) => {
      const group = m.group_name as string;
      const home = standings[group]?.find((t) => t.team === m.home_team);
      const away = standings[group]?.find((t) => t.team === m.away_team);

      if (!home || !away) return;

      addResult(home, m.home_score as number, m.away_score as number);
      addResult(away, m.away_score as number, m.home_score as number);
    });

  Object.keys(standings).forEach((group) => {
    standings[group].sort(
      (a, b) =>
        b.pts - a.pts ||
        b.gd - a.gd ||
        b.gf - a.gf ||
        b.wins - a.wins ||
        a.team.localeCompare(b.team)
    );
  });

  return standings;
}

function bestThirds(standings: Record<string, Standing[]>) {
  return Object.values(standings)
    .map((rows) => rows[2])
    .filter(Boolean)
    .sort(
      (a, b) =>
        b.pts - a.pts ||
        b.gd - a.gd ||
        b.gf - a.gf ||
        b.wins - a.wins ||
        a.team.localeCompare(b.team)
    )
    .slice(0, 8);
}

function resolveGroupToken(token: string, standings: Record<string, Standing[]>) {
  const short = token.match(/^([A-L])([12])$/);

  if (short) {
    const group = short[1];
    const pos = Number(short[2]) - 1;
    return standings[group]?.[pos]?.team ?? token;
  }

  if (token.startsWith("Best 3rd ")) {
    const eligible = token.replace("Best 3rd ", "").split("/");
    const found = bestThirds(standings).find((t) => eligible.includes(t.group));
    return found?.team ?? token;
  }

  return token;
}

function resolveWinnerOrLoser(token: string, matches: Match[], standings: Record<string, Standing[]>) {
  if (token.startsWith("Winner ")) {
    const order = Number(token.replace("Winner ", ""));
    const match = matches.find((m) => m.order_index === order);

    if (!match || !match.is_finished || match.home_score === null || match.away_score === null) {
      return `Câștigătoare Meciul ${order}`;
    }

    const label = resolveLabel(match, matches, standings);
    return match.home_score > match.away_score ? label.home : label.away;
  }

  if (token.startsWith("Loser ")) {
    const order = Number(token.replace("Loser ", ""));
    const match = matches.find((m) => m.order_index === order);

    if (!match || !match.is_finished || match.home_score === null || match.away_score === null) {
      return `Perdantă Meciul ${order}`;
    }

    const label = resolveLabel(match, matches, standings);
    return match.home_score < match.away_score ? label.home : label.away;
  }

  return token;
}

function resolveTeam(token: string, matches: Match[], standings: Record<string, Standing[]>) {
  const byGroup = resolveGroupToken(token, standings);
  if (byGroup !== token) return byGroup;

  return resolveWinnerOrLoser(token, matches, standings);
}

function resolveLabel(match: Match, matches: Match[], standings: Record<string, Standing[]>) {
  if (match.stage === "third") {
    return {
      home: resolveTeam("Loser 101", matches, standings),
      away: resolveTeam("Loser 102", matches, standings),
      subtitle: "Meciul 103",
    };
  }

  if (match.stage === "final") {
    return {
      home: resolveTeam("Winner 101", matches, standings),
      away: resolveTeam("Winner 102", matches, standings),
      subtitle: "Meciul 104",
    };
  }

  return {
    home: resolveTeam(match.home_team, matches, standings),
    away: resolveTeam(match.away_team, matches, standings),
    subtitle: `Meciul ${match.order_index}`,
  };
}

export default function PredictionsKnockoutPage() {
  const router = useRouter();
  const { activePhase, loading: phaseLoading } = useActivePhase();

  const [userId, setUserId] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<PredictionMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [filterStage, setFilterStage] = useState("round32");
  const [toast, setToast] = useState<string | null>(null);

  const standings = useMemo(() => buildStandings(matches), [matches]);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  }

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/");
        return;
      }

      setUserId(user.id);

      const validStages = ["groups", "round32", "round16", "quarter", "semi", "third", "final"];

      const [matchRes, predRes] = await Promise.all([
        supabase.from("matches").select("*").in("stage", validStages).order("order_index", { ascending: true }),
        supabase
          .from("predictions")
          .select("match_id, predicted_home, predicted_away")
          .eq("user_id", user.id),
      ]);

      if (matchRes.data) {
        setMatches(matchRes.data as Match[]);
      }

      if (predRes.data) {
        const map: PredictionMap = {};
        const savedMap: Record<string, boolean> = {};

        predRes.data.forEach((p) => {
          map[p.match_id] = {
            home: String(p.predicted_home),
            away: String(p.predicted_away),
          };
          savedMap[p.match_id] = true;
        });

        setPredictions(map);
        setSaved(savedMap);
      }

      setLoading(false);
    }

    init();
  }, [router]);

  useEffect(() => {
    if (!activePhase) return;
    if (KNOCKOUT_STAGES.some((s) => s.key === activePhase)) {
      setFilterStage(activePhase);
    }
  }, [activePhase]);

  function isStageLocked(stage: string) {
    if (!activePhase) return true;
    if (["groups1", "groups2", "groups3", "closed"].includes(activePhase)) return true;
    return activePhase !== stage;
  }

  async function savePrediction(matchId: string) {
    if (!userId) return;

    const pred = predictions[matchId];
    if (!pred) return;

    const home = parseInt(pred.home, 10);
    const away = parseInt(pred.away, 10);

    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      showToast("Introduceți scoruri valide.");
      return;
    }

    setSaving(matchId);

    const { error } = await supabase.from("predictions").upsert(
      {
        user_id: userId,
        match_id: matchId,
        predicted_home: home,
        predicted_away: away,
      },
      { onConflict: "user_id,match_id" }
    );

    if (error) {
      showToast(`Eroare: ${error.message}`);
    } else {
      setSaved((prev) => ({ ...prev, [matchId]: true }));
      showToast("Prediction saved");
    }

    setSaving(null);
  }

  async function deletePrediction(matchId: string) {
    if (!userId) return;

    const { error } = await supabase
      .from("predictions")
      .delete()
      .eq("user_id", userId)
      .eq("match_id", matchId);

    if (error) {
      showToast(`Eroare la ștergere: ${error.message}`);
      return;
    }

    setPredictions((prev) => ({
      ...prev,
      [matchId]: { home: "", away: "" },
    }));

    setSaved((prev) => ({
      ...prev,
      [matchId]: false,
    }));

    showToast("Pronosticul a fost șters.");
  }

  const knockoutMatches = matches.filter((m) => m.stage !== "groups");
  const filteredMatches = knockoutMatches.filter((m) => m.stage === filterStage);
  const currentStageLocked = isStageLocked(filterStage);
  const currentStageInfo = KNOCKOUT_STAGES.find((s) => s.key === filterStage);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {toast && (
        <div className="fixed right-4 top-4 z-50 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 backdrop-blur">
          {toast}
        </div>
      )}

      <div className="relative h-40 overflow-hidden">
        <img
          src="/images/pronosticuri.jpeg"
          alt="Pronosticuri Eliminatorii"
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-gray-950" />

        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-lg">
            Pronosticuri Faze Eliminatorii
          </h1>

          <Link
            href="/groups"
            className="absolute bottom-4 left-4 rounded-full border border-white/20 bg-black/40 px-4 py-1.5 text-sm text-white/80 backdrop-blur-sm transition-all hover:bg-black/60 hover:text-white"
          >
            ← Înapoi
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
          {!phaseLoading && (
            <div
              className={`rounded-lg border px-3 py-2 text-sm ${
                currentStageLocked
                  ? "border-red-500/20 bg-red-500/10 text-red-400"
                  : "border-green-500/20 bg-green-500/10 text-green-400"
              }`}
            >
              {currentStageLocked
                ? `🔒 ${currentStageInfo?.label ?? filterStage} este închisă pentru pronosticuri.`
                : `✅ ${currentStageInfo?.label ?? filterStage} este deschisă – poți introduce pronosticuri!`}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {KNOCKOUT_STAGES.map((stage) => (
              <button
                key={stage.key}
                onClick={() => setFilterStage(stage.key)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-all ${
                  filterStage === stage.key
                    ? "bg-amber-500 text-black"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
              >
                {stage.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-white/50">Se încarcă meciurile...</div>
        ) : filteredMatches.length === 0 ? (
          <div className="py-12 text-center text-white/50">
            Nu există meciuri pentru această rundă.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMatches.map((match) => {
              const pred = predictions[match.id] ?? { home: "", away: "" };
              const locked = currentStageLocked || match.is_finished;
              const wasSaved = saved[match.id];
              const labels = resolveLabel(match, matches, standings);

              return (
                <div
                  key={match.id}
                  className={`overflow-hidden rounded-xl border bg-white/5 ${
                    locked ? "border-white/5 opacity-75" : "border-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-white/5 bg-white/5 px-3 py-1.5">
                    <span className="text-xs text-white/40">{labels.subtitle}</span>

                    {match.is_finished &&
                      match.home_score !== null &&
                      match.away_score !== null && (
                        <span className="text-xs text-green-400">
                          Rezultat: {match.home_score} – {match.away_score}
                        </span>
                      )}
                  </div>

                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 text-right">
                      <span className="text-sm font-semibold text-white">{labels.home}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={pred.home}
                        disabled={locked}
                        onChange={(e) =>
                          setPredictions((prev) => ({
                            ...prev,
                            [match.id]: {
                              ...(prev[match.id] ?? { home: "", away: "" }),
                              home: e.target.value,
                            },
                          }))
                        }
                        className="w-10 rounded-lg border border-white/20 bg-gray-900 px-1.5 py-1 text-center text-base font-bold text-white focus:border-amber-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                        placeholder="–"
                      />

                      <span className="text-white/40">:</span>

                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={pred.away}
                        disabled={locked}
                        onChange={(e) =>
                          setPredictions((prev) => ({
                            ...prev,
                            [match.id]: {
                              ...(prev[match.id] ?? { home: "", away: "" }),
                              away: e.target.value,
                            },
                          }))
                        }
                        className="w-10 rounded-lg border border-white/20 bg-gray-900 px-1.5 py-1 text-center text-base font-bold text-white focus:border-amber-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                        placeholder="–"
                      />
                    </div>

                    <div className="flex-1">
                      <span className="text-sm font-semibold text-white">{labels.away}</span>
                    </div>

                    {!locked && (
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => savePrediction(match.id)}
                          disabled={saving === match.id}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                            wasSaved
                              ? "bg-green-600 text-white"
                              : "bg-amber-500 text-black hover:bg-amber-400"
                          } disabled:opacity-50`}
                        >
                          {saving === match.id ? "..." : wasSaved ? "✓ Salvat" : "Salvează"}
                        </button>

                        <button
                          onClick={() => deletePrediction(match.id)}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
                        >
                          Șterge
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
