"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
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

const KNOCKOUT_STAGES = [
  { key: "round32", label: "Șaisprezecimi" },
  { key: "round16", label: "Optimi de finală" },
  { key: "quarter", label: "Sferturi de finală" },
  { key: "semi", label: "Semifinale" },
  { key: "third", label: "Finala mică" },
  { key: "final", label: "Finala" },
];

const STAGE_LABELS: Record<string, string> = {
  round32: "Șaisprezecimi",
  round16: "Optimi de finală",
  quarter: "Sferturi de finală",
  semi: "Semifinale",
  third: "Finala mică",
  final: "Finala",
};

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

      const validStages = [
        "round32",
        "round16",
        "quarter",
        "semi",
        "third",
        "final",
      ];

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

        predRes.data.forEach((p: any) => {
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

    if (KNOCKOUT_STAGES.some((stage) => stage.key === activePhase)) {
      setFilterStage(activePhase);
    }
  }, [activePhase]);

  function isStageLocked(stageKey: string): boolean {
    if (!activePhase) return true;

    if (["groups1", "groups2", "groups3", "closed"].includes(activePhase)) {
      return true;
    }

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

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => match.stage === filterStage);
  }, [matches, filterStage]);

  const currentStageLocked = isStageLocked(filterStage);
  const currentStageInfo = KNOCKOUT_STAGES.find(
    (stage) => stage.key === filterStage
  );

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
          alt="Pronosticuri Faze Eliminatorii"
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
                ? `🔒 ${
                    currentStageInfo?.label ?? filterStage
                  } este închisă pentru pronosticuri.`
                : `✅ ${
                    currentStageInfo?.label ?? filterStage
                  } este deschisă – poți introduce pronosticuri!`}
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
            Nu există meciuri pentru această rundă.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMatches.map((match) => {
              const pred = predictions[match.id] ?? { home: "", away: "" };
              const locked = currentStageLocked || match.is_finished;
              const wasSaved = saved[match.id];

              return (
                <div
                  key={match.id}
                  className={`overflow-hidden rounded-xl border bg-white/5 ${
                    locked ? "border-white/5 opacity-75" : "border-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-white/5 bg-white/5 px-3 py-1.5">
                    <span className="text-xs text-white/40">
                      Meciul {match.order_index} ·{" "}
                      {STAGE_LABELS[match.stage] ?? match.stage}
                    </span>

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
                        {match.home_team}
                      </span>
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
                              ...(prev[match.id] ?? {
                                home: "",
                                away: "",
                              }),
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
                              ...(prev[match.id] ?? {
                                home: "",
                                away: "",
                              }),
                              away: e.target.value,
                            },
                          }))
                        }
                        className="w-10 rounded-lg border border-white/20 bg-gray-900 px-1.5 py-1 text-center text-base font-bold text-white focus:border-amber-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                        placeholder="–"
                      />
                    </div>

                    <div className="flex-1">
                      <span className="text-sm font-semibold text-white">
                        {match.away_team}
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
