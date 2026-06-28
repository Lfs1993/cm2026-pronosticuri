"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useActivePhase } from "@/lib/useActivePhase";

type Match = {
  id: string;
  stage: string;
  order_index: number;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  is_finished: boolean;
};

type PredictionMap = Record<string, { home: string; away: string }>;

const KNOCKOUT_STAGES = [
  { key: "round32", label: "Șaisprezecimi" },
  { key: "round16", label: "Optimi de finală" },
  { key: "quarter", label: "Sferturi de finală" },
  { key: "semi", label: "Semifinale" },
  { key: "third", label: "Finala mică" },
  { key: "final", label: "Finala" },
];

const ROUND32_LABELS: Record<number, { home: string; away: string; subtitle: string }> = {
  73: {
    home: "Locul 2 Grupa A",
    away: "Locul 2 Grupa B",
    subtitle: "Meciul 73 · 28 iunie · Los Angeles",
  },
  74: {
    home: "Locul 1 Grupa E",
    away: "Locul 3 din A/B/C/D/F",
    subtitle: "Meciul 74 · 29 iunie · Boston",
  },
  75: {
    home: "Locul 1 Grupa F",
    away: "Locul 2 Grupa C",
    subtitle: "Meciul 75 · 29 iunie · Monterrey",
  },
  76: {
    home: "Locul 1 Grupa C",
    away: "Locul 2 Grupa F",
    subtitle: "Meciul 76 · 29 iunie · Houston",
  },
  77: {
    home: "Locul 1 Grupa I",
    away: "Locul 3 din C/D/F/G/H",
    subtitle: "Meciul 77 · 30 iunie · New York/New Jersey",
  },
  78: {
    home: "Locul 2 Grupa E",
    away: "Locul 2 Grupa I",
    subtitle: "Meciul 78 · 30 iunie · Dallas",
  },
  79: {
    home: "Locul 1 Grupa A",
    away: "Locul 3 din C/E/F/H/I",
    subtitle: "Meciul 79 · 30 iunie · Mexico City",
  },
  80: {
    home: "Locul 1 Grupa L",
    away: "Locul 3 din E/H/I/J/K",
    subtitle: "Meciul 80 · 1 iulie · Atlanta",
  },
  81: {
    home: "Locul 1 Grupa D",
    away: "Locul 3 din B/E/F/I/J",
    subtitle: "Meciul 81 · 1 iulie · San Francisco Bay Area",
  },
  82: {
    home: "Locul 1 Grupa G",
    away: "Locul 3 din A/E/H/I/J",
    subtitle: "Meciul 82 · 1 iulie · Seattle",
  },
  83: {
    home: "Locul 2 Grupa K",
    away: "Locul 2 Grupa L",
    subtitle: "Meciul 83 · 2 iulie · Toronto",
  },
  84: {
    home: "Locul 1 Grupa H",
    away: "Locul 2 Grupa J",
    subtitle: "Meciul 84 · 2 iulie · Los Angeles",
  },
  85: {
    home: "Locul 1 Grupa B",
    away: "Locul 3 din E/F/G/I/J",
    subtitle: "Meciul 85 · 2 iulie · Vancouver",
  },
  86: {
    home: "Locul 1 Grupa J",
    away: "Locul 2 Grupa H",
    subtitle: "Meciul 86 · 3 iulie · Miami",
  },
  87: {
    home: "Locul 1 Grupa K",
    away: "Locul 3 din D/E/I/J/L",
    subtitle: "Meciul 87 · 3 iulie · Kansas City",
  },
  88: {
    home: "Locul 2 Grupa D",
    away: "Locul 2 Grupa G",
    subtitle: "Meciul 88 · 3 iulie · Dallas",
  },
};

const ROUND16_LABELS: Record<number, { home: string; away: string; subtitle: string }> = {
  89: {
    home: "Câștigătoare Meciul 74",
    away: "Câștigătoare Meciul 77",
    subtitle: "Meciul 89 · Optimi",
  },
  90: {
    home: "Câștigătoare Meciul 73",
    away: "Câștigătoare Meciul 75",
    subtitle: "Meciul 90 · Optimi",
  },
  91: {
    home: "Câștigătoare Meciul 76",
    away: "Câștigătoare Meciul 78",
    subtitle: "Meciul 91 · Optimi",
  },
  92: {
    home: "Câștigătoare Meciul 79",
    away: "Câștigătoare Meciul 80",
    subtitle: "Meciul 92 · Optimi",
  },
  93: {
    home: "Câștigătoare Meciul 83",
    away: "Câștigătoare Meciul 84",
    subtitle: "Meciul 93 · Optimi",
  },
  94: {
    home: "Câștigătoare Meciul 81",
    away: "Câștigătoare Meciul 82",
    subtitle: "Meciul 94 · Optimi",
  },
  95: {
    home: "Câștigătoare Meciul 86",
    away: "Câștigătoare Meciul 88",
    subtitle: "Meciul 95 · Optimi",
  },
  96: {
    home: "Câștigătoare Meciul 85",
    away: "Câștigătoare Meciul 87",
    subtitle: "Meciul 96 · Optimi",
  },
};

const QUARTER_LABELS: Record<number, { home: string; away: string; subtitle: string }> = {
  97: {
    home: "Câștigătoare Meciul 89",
    away: "Câștigătoare Meciul 90",
    subtitle: "Meciul 97 · Sferturi",
  },
  98: {
    home: "Câștigătoare Meciul 93",
    away: "Câștigătoare Meciul 94",
    subtitle: "Meciul 98 · Sferturi",
  },
  99: {
    home: "Câștigătoare Meciul 91",
    away: "Câștigătoare Meciul 92",
    subtitle: "Meciul 99 · Sferturi",
  },
  100: {
    home: "Câștigătoare Meciul 95",
    away: "Câștigătoare Meciul 96",
    subtitle: "Meciul 100 · Sferturi",
  },
};

const SEMI_LABELS: Record<number, { home: string; away: string; subtitle: string }> = {
  101: {
    home: "Câștigătoare Meciul 97",
    away: "Câștigătoare Meciul 98",
    subtitle: "Meciul 101 · Semifinală",
  },
  102: {
    home: "Câștigătoare Meciul 99",
    away: "Câștigătoare Meciul 100",
    subtitle: "Meciul 102 · Semifinală",
  },
};

function getMatchLabel(match: Match): { home: string; away: string; subtitle: string } {
  const order = match.order_index;

  if (match.stage === "round32" && ROUND32_LABELS[order]) {
    return ROUND32_LABELS[order];
  }

  if (match.stage === "round16" && ROUND16_LABELS[order]) {
    return ROUND16_LABELS[order];
  }

  if (match.stage === "quarter" && QUARTER_LABELS[order]) {
    return QUARTER_LABELS[order];
  }

  if (match.stage === "semi" && SEMI_LABELS[order]) {
    return SEMI_LABELS[order];
  }

  if (match.stage === "third") {
    return {
      home: "Perdanta Semifinalei 1",
      away: "Perdanta Semifinalei 2",
      subtitle: "Meciul 103 · Finala mică",
    };
  }

  if (match.stage === "final") {
    return {
      home: "Câștigătoare Semifinala 1",
      away: "Câștigătoare Semifinala 2",
      subtitle: "Meciul 104 · Finala",
    };
  }

  return {
    home: match.home_team || "TBD",
    away: match.away_team || "TBD",
    subtitle: `Meciul ${order}`,
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
  const [filterStage, setFilterStage] = useState<string>("round32");
  const [toast, setToast] = useState<string | null>(null);

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

      const validStages = KNOCKOUT_STAGES.map((stage) => stage.key);

      const [matchRes, predRes] = await Promise.all([
        supabase
          .from("matches")
          .select("*")
          .in("stage", validStages)
          .order("order_index", { ascending: true }),
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

        predRes.data.forEach(
          (prediction: {
            match_id: string;
            predicted_home: number;
            predicted_away: number;
          }) => {
            map[prediction.match_id] = {
              home: prediction.predicted_home.toString(),
              away: prediction.predicted_away.toString(),
            };
            savedMap[prediction.match_id] = true;
          }
        );

        setPredictions(map);
        setSaved(savedMap);
      }

      setLoading(false);
    }

    init();
  }, [router]);

  useEffect(() => {
    if (!activePhase) return;

    const exists = KNOCKOUT_STAGES.find((stage) => stage.key === activePhase);
    if (exists) setFilterStage(activePhase);
  }, [activePhase]);

  function isStageLocked(stageKey: string): boolean {
    if (!activePhase) return true;
    if (["groups1", "groups2", "groups3", "closed"].includes(activePhase)) return true;
    return activePhase !== stageKey;
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

  const currentStageInfo = KNOCKOUT_STAGES.find((stage) => stage.key === filterStage);
  const filteredMatches = useMemo(
    () => matches.filter((match) => match.stage === filterStage),
    [matches, filterStage]
  );
  const currentStageLocked = isStageLocked(filterStage);

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
          <div className="py-12 text-center text-white/50">
            Se încarcă meciurile...
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="py-12 text-center text-white/50">
            Meciurile pentru această rundă nu există încă în baza de date.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMatches.map((match) => {
              const pred = predictions[match.id] ?? { home: "", away: "" };
              const locked = currentStageLocked || match.is_finished;
              const wasSaved = saved[match.id];
              const labels = getMatchLabel(match);

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
                      <span className="text-sm font-semibold text-white">
                        {labels.home}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={pred.home}
                        disabled={locked}
                        onChange={(event) =>
                          setPredictions((prev) => ({
                            ...prev,
                            [match.id]: {
                              ...(prev[match.id] ?? { home: "", away: "" }),
                              home: event.target.value,
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
                        onChange={(event) =>
                          setPredictions((prev) => ({
                            ...prev,
                            [match.id]: {
                              ...(prev[match.id] ?? { home: "", away: "" }),
                              away: event.target.value,
                            },
                          }))
                        }
                        className="w-10 rounded-lg border border-white/20 bg-gray-900 px-1.5 py-1 text-center text-base font-bold text-white focus:border-amber-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                        placeholder="–"
                      />
                    </div>

                    <div className="flex-1">
                      <span className="text-sm font-semibold text-white">
                        {labels.away}
                      </span>
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
                          {saving === match.id
                            ? "..."
                            : wasSaved
                            ? "✓ Salvat"
                            : "Salvează"}
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
