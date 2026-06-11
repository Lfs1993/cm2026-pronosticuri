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

type UserPredictions = {
  user_id: string;
  display_name: string;
  predictions: Prediction[];
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

function calcPoints(pred: Prediction, match: Match): { pts: number; label: string } {
  if (!match.is_finished) return { pts: 0, label: "⏳" };
  const h = match.home_score!; const a = match.away_score!;
  if (pred.predicted_home === h && pred.predicted_away === a) return { pts: 3, label: "✅ 3pts" };
  const mw = h > a ? "home" : a > h ? "away" : "draw";
  const pw = pred.predicted_home > pred.predicted_away ? "home"
    : pred.predicted_home < pred.predicted_away ? "away" : "draw";
  if (mw === pw) return { pts: 1, label: "🟡 1pt" };
  return { pts: 0, label: "❌ 0" };
}

export default function AdminResultsPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"results" | "users">("results");

  const [filterStage, setFilterStage] = useState<string>("groups");
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [filterMatchday, setFilterMatchday] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "finished" | "pending">("all");
  const [filterStageUsers, setFilterStageUsers] = useState<string>("groups");

  const [scores, setScores] = useState<Record<string, { home: string; away: string }>>({});

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { router.push("/"); return; }
      const { data: prof } = await supabase
        .from("profiles").select("id, is_admin").eq("id", user.id).single();
      if (!prof?.is_admin) { router.push("/"); return; }
      setProfile(prof);
    }
    checkAuth();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [matchRes, predRes, profilesRes] = await Promise.all([
      supabase.from("matches").select("*").order("order_index"),
      supabase.from("predictions").select("user_id, match_id, predicted_home, predicted_away"),
      supabase.from("profiles").select("id, display_name"),
    ]);

    if (matchRes.data) {
      setMatches(matchRes.data);
      const initial: Record<string, { home: string; away: string }> = {};
      matchRes.data.forEach((m: Match) => {
        initial[m.id] = { home: m.home_score?.toString() ?? "", away: m.away_score?.toString() ?? "" };
      });
      setScores(initial);
    }

    if (predRes.data && profilesRes.data) {
      const profileMap: Record<string, string> = {};
      profilesRes.data.forEach((p: { id: string; display_name: string }) => {
        profileMap[p.id] = p.display_name;
      });
      const predsWithProfiles = predRes.data.map((p: { user_id: string; match_id: string; predicted_home: number; predicted_away: number }) => ({
        ...p,
        profiles: [{ display_name: profileMap[p.user_id] ?? "User" }],
      }));
      setPredictions(predsWithProfiles as Prediction[]);
    }

    setLoading(false);
  }, [])

  useEffect(() => { if (profile) fetchData(); }, [profile, fetchData]);

  async function saveResult(matchId: string) {
    const s = scores[matchId];
    if (!s) return;
    const home = parseInt(s.home); const away = parseInt(s.away);
    if (isNaN(home) || isNaN(away)) { alert("Introduceți scoruri valide!"); return; }
    setSaving(matchId);
    const { error } = await supabase.from("matches")
      .update({ home_score: home, away_score: away, is_finished: true }).eq("id", matchId);
    if (error) alert(`Eroare: ${error.message}`);
    else await fetchData();
    setSaving(null);
  }

  async function clearResult(matchId: string) {
    if (!confirm("Ești sigur că vrei să ștergi rezultatul?")) return;
    setSaving(matchId);
    const { error } = await supabase.from("matches")
      .update({ home_score: null, away_score: null, is_finished: false }).eq("id", matchId);
    if (error) alert(`Eroare: ${error.message}`);
    else await fetchData();
    setSaving(null);
  }

  // Filtrare meciuri tab Rezultate
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

  // Date pentru tab Pronosticuri Useri
  const userPredictions: UserPredictions[] = (() => {
    const map: Record<string, UserPredictions> = {};
    predictions.forEach(p => {
      if (!map[p.user_id]) {
        map[p.user_id] = {
          user_id: p.user_id,
          display_name: p.profiles?.[0]?.display_name ?? "User",
          predictions: [],
        };
      }
      map[p.user_id].predictions.push(p);
    });
    return Object.values(map).sort((a, b) => a.display_name.localeCompare(b.display_name));
  })();

  const matchesForUsersTab = matches.filter(m => m.stage === filterStageUsers);

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
        <img src="/images/clasament.webp" alt="Admin" className="h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-gray-950" />
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-lg">Rezultate Finale – Admin</h1>
          <Link href="/groups"
            className="absolute left-4 bottom-4 rounded-full border border-white/20 bg-black/40 px-4 py-1.5 text-sm text-white/80 backdrop-blur-sm transition-all hover:bg-black/60 hover:text-white">
            ← Înapoi
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">

        <ActivePhaseControl />

        {/* Tab-uri */}
        <div className="flex gap-2 border-b border-white/10 pb-0">
          <button
            onClick={() => setActiveTab("results")}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-all ${
              activeTab === "results"
                ? "bg-white/10 text-white border border-white/10 border-b-gray-950"
                : "text-white/50 hover:text-white/80"
            }`}>
            📋 Rezultate meciuri
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-all ${
              activeTab === "users"
                ? "bg-white/10 text-white border border-white/10 border-b-gray-950"
                : "text-white/50 hover:text-white/80"
            }`}>
            👥 Pronosticuri useri
          </button>
        </div>

        {/* ─── TAB REZULTATE ─── */}
        {activeTab === "results" && (
          <div className="space-y-6">

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

            {loading ? (
              <div className="text-center py-12 text-white/50">Se încarcă...</div>
            ) : filteredMatches.length === 0 ? (
              <div className="text-center py-12 text-white/50">Niciun meci găsit.</div>
            ) : (
              <div className="space-y-6">
                {filteredMatches.map(match => {
                  const matchPreds = getPredictionsForMatch(match.id);
                  const sc = scores[match.id] ?? { home: "", away: "" };
                  return (
                    <div key={match.id} className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
                        <span className="text-xs text-white/40">
                          {match.group_name ? `Grupa ${match.group_name}` : STAGE_LABELS[match.stage] ?? match.stage}
                          {match.matchday ? ` · Etapa ${match.matchday}` : ""}
                          {match.is_finished && (
                            <span className="ml-2 rounded-full bg-green-500/20 border border-green-500/30 px-2 py-0.5 text-green-400">Finalizat</span>
                          )}
                        </span>
                        <span className="text-xs text-white/30">{matchPreds.length} pronosticuri</span>
                      </div>
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
                      {matchPreds.length > 0 && (
                        <div className="border-t border-white/10 px-4 py-3">
                          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/40">Pronosticurile jucătorilor</p>
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
        )}

        {/* ─── TAB PRONOSTICURI USERI ─── */}
        {activeTab === "users" && (
          <div className="space-y-6">

            {/* Filtru etapă */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
              <p className="text-sm font-medium text-white/70">Filtrează etapă</p>
              <div className="flex flex-wrap gap-2">
                {STAGE_ORDER.map(stage => (
                  <button key={stage} onClick={() => setFilterStageUsers(stage)}
                    className={`rounded-full px-3 py-1 text-sm font-medium transition-all ${
                      filterStageUsers === stage ? "bg-amber-500 text-black" : "bg-white/10 text-white/70 hover:bg-white/20"
                    }`}>
                    {STAGE_LABELS[stage]}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 text-white/50">Se încarcă...</div>
            ) : userPredictions.length === 0 ? (
              <div className="text-center py-12 text-white/50">Nu există pronosticuri încă.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {userPredictions.map(user => {
                  const totalPts = matchesForUsersTab.reduce((sum, match) => {
                    const pred = user.predictions.find(p => p.match_id === match.id);
                    if (!pred) return sum;
                    return sum + calcPoints(pred, match).pts;
                  }, 0);

                  return (
                    <div key={user.user_id} className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">

                      {/* Header user */}
                      <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10">
                        <span className="font-semibold text-white">{user.display_name}</span>
                        <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-3 py-0.5 text-xs font-bold text-amber-400">
                          {totalPts} pts
                        </span>
                      </div>

                      {/* Tabel pronosticuri */}
                      <div className="divide-y divide-white/5">
                        {matchesForUsersTab.length === 0 ? (
                          <p className="px-4 py-3 text-xs text-white/40">Nu există meciuri pentru această etapă.</p>
                        ) : (
                          matchesForUsersTab.map(match => {
                            const pred = user.predictions.find(p => p.match_id === match.id);
                            const result = pred ? calcPoints(pred, match) : null;

                            return (
                              <div key={match.id} className="flex items-center gap-2 px-4 py-2.5">
                                {/* Meci */}
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs text-white/50 truncate block">
                                    {match.home_team} vs {match.away_team}
                                  </span>
                                  {match.is_finished && match.home_score !== null && (
                                    <span className="text-xs text-green-400">
                                      Rezultat: {match.home_score}–{match.away_score}
                                    </span>
                                  )}
                                </div>

                                {/* Pronostic */}
                                {pred ? (
                                  <span className="text-sm font-bold text-white shrink-0">
                                    {pred.predicted_home}–{pred.predicted_away}
                                  </span>
                                ) : (
                                  <span className="text-xs text-white/25 shrink-0">–</span>
                                )}

                                {/* Puncte */}
                                <span className="text-xs shrink-0 w-16 text-right">
                                  {result ? result.label : <span className="text-white/25">–</span>}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
