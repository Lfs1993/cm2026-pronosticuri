"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import ActivePhaseControl from "@/components/admin/ActivePhaseControl";

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

type Prediction = {
  user_id: string;
  match_id: string;
  predicted_home: number;
  predicted_away: number;
  profiles: { display_name: string }[] | null;
};

type Profile = {
  id: string;
  is_admin: boolean;
};

const STAGE_LABELS: Record<string, string> = {
  groups:  "Grupe",
  round16: "Optimi",
  quarter: "Sferturi",
  semi:    "Semifinale",
  third:   "Finala mică",
  final:   "Finala",
};

const STAGE_ORDER = ["groups", "round16", "quarter", "semi", "third", "final"];

export default function AdminResultsPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const [filterStage, setFilterStage] = useState<string>("groups");
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [filterMatchday, setFilterMatchday] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "finished" | "pending">("all");

  const [scores, setScores] = useState<Record<string, { home: string; away: string }>>({});

  // Auth check
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { router.push("/"); return; }

      const { data: prof } = await supabase
        .from("profiles")
        .select("id, is_admin")
        .eq("id", user.id)
        .single();

      if (!prof?.is_admin) { router.push("/"); return; }
      setProfile(prof);
    }
    checkAuth();
  }, []);

  // Fetch matches + predictions
  const fetchData = useCallback(async () => {
    setLoading(true);
    const [matchRes, predRes] = await Promise.all([
      supabase.from("matches").select("*").order("order_index"),
      supabase.from("predictions").select("user_id, match_id, predicted_home, predicted_away, profiles(display_name)"),
    ]);

    if (matchRes.data) {
      setMatches(matchRes.data);
      const initial: Record<string, { home: string; away: string }> = {};
      matchRes.data.forEach((m: Match) => {
        initial[m.id] = {
          home: m.home_score?.toString() ?? "",
          away: m.away_score?.toString() ?? "",
        };
      });
      setScores(initial);
    }

    if (predRes.data) setPredictions(predRes.data as Prediction[]);
    setLoading(false);
  }, []);

  useEffect(() => { if (profile) fetchData(); }, [profile, fetchData]);

  // Salvare rezultat
  async function saveResult(matchId: string) {
    const s = scores[matchId];
    if (!s) return;
    const home = parseInt(s.home);
    const away = parseInt(s.away);
    if (isNaN(home) || isNaN(away)) { alert("Introduceți scoruri valide!"); return; }

    setSaving(matchId);
    const { error } = await supabase
      .from("matches")
      .update({ home_score: home, away_score: away, is_finished: true })
      .eq("id", matchId);

    if (error) alert(`Eroare la salvare: ${error.message}`);
    else await fetchData();
    setSaving(null);
  }

  // Ștergere rezultat
  async function clearResult(matchId: string) {
    if (!confirm("Ești sigur că vrei să ștergi rezultatul acestui meci?")) return;

    setSaving(matchId);
    const { error } = await supabase
      .from("matches")
      .update({ home_score: null, away_score: null, is_finished: false })
      .eq("id", matchId);

    if (error) alert(`Eroare la ștergere: ${error.message}`);
    else await fetchData();
    setSaving(null);
  }

  // Filtrare
  const availableGroups = [...new Set(
    matches.filter(m => m.stage === "groups" && m.group_name).map(m => m.group_name!)
  )].sort();

  const filteredMatches = matches.filter(m => {
    if (m.stage !== filterStage) return false;
    if (filterStage === "groups") {
      if (filterGroup !== "all" && m.group_name !== filterGroup) return false;
      if (filterMatchday !== "all" && m.matchday?.toString() !== filterMatchday) return false;
    }
    if (filterStatus === "finished" && !m.is_finished) return false;
    if (filterStatus === "pending" && m.is_finished) return false;
    return true;
  });

  function getPredictionsForMatch(matchId: string) {
    return predictions.filter(p => p.match_id === matchId);
  }

  function getPredictionResult(pred: Prediction, match: Match): string {
    if (!match.is_finished) return "⏳";
    const h = match.home_score!; const a = match.away_score!;
    if (pred.predicted_home === h && pred.predicted_away === a) return "✅";
    const mw = h > a ? "home" : a > h ? "away" : "draw";
    const pw = pred.predicted_home > pred.predicted_away ? "home"
      : pred.predicted_home < pred.predicted_away ? "away" : "draw";
    if (mw === pw) return "🟡";
    return "❌";
  }

  if (loading && !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <p className="text-white/50">Se verifică accesul...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Banner */}
      <div className="relative h-40 overflow-hidden">
        <img src="/images/clasament.webp" alt="Admin"
          className="h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-gray-950" />
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-lg">
            Rezultate Finale – Admin
          </h1>
          <Link
            href="/groups"
            className="absolute left-4 bottom-4 rounded-full border border-white/20 bg-black/40 px-4 py-1.5 text-sm text-white/80 backdrop-blur-sm transition-all hover:bg-black/60 hover:text-white"
          >
            ← Înapoi
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">

        {/* Control etapă activă */}
        <ActivePhaseControl />

        {/* Filtre */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <p className="text-sm font-medium text-white/70">Filtrează meciuri</p>

          <div className="flex flex-wrap gap-2">
            {STAGE_ORDER.map(stage => (
              <button key={stage}
                onClick={() => { setFilterStage(stage); setFilterGroup("all"); setFilterMatchday("all"); }}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-all ${
                  filterStage === stage ? "bg-amber-500 text-black" : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}>
                {STAGE_LABELS[stage]}
              </button>
            ))}
          </div>

          {filterStage === "groups" && (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setFilterGroup("all")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  filterGroup === "all" ? "bg-amber-500/80 text-black" : "bg-white/10 text-white/60 hover:bg-white/20"
                }`}>
                Toate grupele
              </button>
              {availableGroups.map(g => (
                <button key={g} onClick={() => setFilterGroup(g)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    filterGroup === g ? "bg-amber-500/80 text-black" : "bg-white/10 text-white/60 hover:bg-white/20"
                  }`}>
                  Grupa {g}
                </button>
              ))}
              <span className="self-stretch w-px bg-white/10 mx-1" />
              {["all", "1", "2", "3"].map(md => (
                <button key={md} onClick={() => setFilterMatchday(md)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    filterMatchday === md ? "bg-blue-500/80 text-white" : "bg-white/10 text-white/60 hover:bg-white/20"
                  }`}>
                  {md === "all" ? "Toate etapele" : `Etapa ${md}`}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            {(["all", "finished", "pending"] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  filterStatus === s ? "bg-white/30 text-white" : "bg-white/10 text-white/50 hover:bg-white/20"
                }`}>
                {s === "all" ? "Toate" : s === "finished" ? "✅ Finalizate" : "⏳ Fără rezultat"}
              </button>
            ))}
          </div>
        </div>

        {/* Lista meciuri */}
        {loading ? (
          <div className="text-center py-12 text-white/50">Se încarcă meciurile...</div>
        ) : filteredMatches.length === 0 ? (
          <div className="text-center py-12 text-white/50">Niciun meci găsit cu filtrele selectate.</div>
        ) : (
          <div className="space-y-6">
            {filteredMatches.map(match => {
              const matchPreds = getPredictionsForMatch(match.id);
              const sc = scores[match.id] ?? { home: "", away: "" };

              return (
                <div key={match.id} className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">

                  {/* Header meci */}
                  <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
                    <span className="text-xs text-white/40">
                      {match.group_name ? `Grupa ${match.group_name}` : STAGE_LABELS[match.stage] ?? match.stage}
                      {match.matchday ? ` · Etapa ${match.matchday}` : ""}
                      {match.is_finished && (
                        <span className="ml-2 rounded-full bg-green-500/20 border border-green-500/30 px-2 py-0.5 text-green-400">
                          Finalizat
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-white/30">{matchPreds.length} pronosticuri</span>
                  </div>

                  {/* Echipe + input scoruri */}
                  <div className="flex items-center gap-3 px-4 py-4">
                    <span className="flex-1 text-right font-semibold text-white">{match.home_team}</span>
                    <div className="flex items-center gap-2">
                      <input type="number" min={0} max={99} value={sc.home}
                        onChange={e => setScores(prev => ({ ...prev, [match.id]: { ...prev[match.id], home: e.target.value } }))}
                        className="w-12 rounded-lg border border-white/20 bg-gray-900 px-2 py-1.5 text-center text-lg font-bold text-white focus:border-amber-500 focus:outline-none"
                        placeholder="–" />
                      <span className="text-white/40 font-bold">:</span>
                      <input type="number" min={0} max={99} value={sc.away}
                        onChange={e => setScores(prev => ({ ...prev, [match.id]: { ...prev[match.id], away: e.target.value } }))}
                        className="w-12 rounded-lg border border-white/20 bg-gray-900 px-2 py-1.5 text-center text-lg font-bold text-white focus:border-amber-500 focus:outline-none"
                        placeholder="–" />
                    </div>
                    <span className="flex-1 font-semibold text-white">{match.away_team}</span>

                    {/* Butoane Salvează + Șterge */}
                    <div className="flex gap-2">
                      <button onClick={() => saveResult(match.id)} disabled={saving === match.id}
                        className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-50 transition-colors">
                        {saving === match.id ? "..." : "Salvează"}
                      </button>
                      {match.is_finished && (
                        <button onClick={() => clearResult(match.id)} disabled={saving === match.id}
                          className="rounded-lg bg-red-600/80 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50 transition-colors">
                          🗑
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Pronosticuri useri */}
                  {matchPreds.length > 0 && (
                    <div className="border-t border-white/10 px-4 py-3">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/40">
                        Pronosticurile jucătorilor
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {matchPreds.map(pred => (
                          <div key={pred.user_id}
                            className="flex items-center justify-between rounded-lg bg-white/5 border border-white/10 px-3 py-2">
                            <span className="text-xs text-white/70 truncate max-w-[80px]">
                              {pred.profiles?.[0]?.display_name ?? "User"}
                            </span>
                            <span className="text-sm font-bold text-white ml-2 shrink-0">
                              {pred.predicted_home} – {pred.predicted_away}
                            </span>
                            <span className="ml-1 text-xs shrink-0">
                              {getPredictionResult(pred, match)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
