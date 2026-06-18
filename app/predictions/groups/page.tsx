"use client";

import Link from "next/link";
import Image from "next/image";
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
  lock_at?: string | null;
};

type PredictionMap = Record<string, { home: string; away: string }>;

type OtherUserPred = {
  user_id: string;
  display_name: string;
  predictions: Record<string, { home: number; away: number }>;
};

const MATCHDAY_PHASE: Record<number, string> = {
  1: "groups1",
  2: "groups2",
  3: "groups3",
};

export default function PredictionsGroupsPage() {
  const router = useRouter();
  const { activePhase, loading: phaseLoading } = useActivePhase();

  const [userId, setUserId] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<PredictionMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  // Tab activ
  const [activeTab, setActiveTab] = useState<"mine" | "others">("mine");

  // Filtre
  const [filterMatchday, setFilterMatchday] = useState<string>("1");
  const [filterGroup, setFilterGroup] = useState<string>("all");

  // Alți useri
  const [otherUsers, setOtherUsers] = useState<OtherUserPred[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }
      setUserId(user.id);

      const [matchRes, predRes, allPredRes, profilesRes] = await Promise.all([
        supabase.from("matches").select("*").eq("stage", "groups").order("order_index", { ascending: true }),
        supabase.from("predictions").select("match_id, predicted_home, predicted_away").eq("user_id", user.id),
        supabase.from("predictions").select("user_id, match_id, predicted_home, predicted_away"),
        supabase.from("profiles").select("id, display_name"),
      ]);

      if (matchRes.data) setMatches(matchRes.data as Match[]);

      if (predRes.data) {
        const map: PredictionMap = {};
        predRes.data.forEach((p: { match_id: string; predicted_home: number; predicted_away: number }) => {
          map[p.match_id] = { home: p.predicted_home.toString(), away: p.predicted_away.toString() };
          // Marcăm ca salvat inițial dacă există în baza de date
          setSaved(prev => ({ ...prev, [p.match_id]: true }));
        });
        setPredictions(map);
      }

      // Construiește pronosticurile celorlalți useri
      if (allPredRes.data && profilesRes.data) {
        const profileMap: Record<string, string> = {};
        profilesRes.data.forEach((p: { id: string; display_name: string }) => {
          profileMap[p.id] = p.display_name;
        });

        const usersMap: Record<string, OtherUserPred> = {};
        allPredRes.data.forEach((p: { user_id: string; match_id: string; predicted_home: number; predicted_away: number }) => {
          if (p.user_id === user.id) return; // Excludem userul curent
          if (!usersMap[p.user_id]) {
            usersMap[p.user_id] = {
              user_id: p.user_id,
              display_name: profileMap[p.user_id] ?? "User",
              predictions: {},
            };
          }
          usersMap[p.user_id].predictions[p.match_id] = { home: p.predicted_home, away: p.predicted_away };
        });

        setOtherUsers(Object.values(usersMap).sort((a, b) => a.display_name.localeCompare(b.display_name)));
      }

      setLoading(false);
    }
    init();
  }, [router]);

  useEffect(() => {
    if (!activePhase) return;
    if (activePhase === "groups1") setFilterMatchday("1");
    else if (activePhase === "groups2") setFilterMatchday("2");
    else if (activePhase === "groups3") setFilterMatchday("3");
  }, [activePhase]);

  function isMatchdayLocked(matchday: number): boolean {
    if (!activePhase) return true;
    if (["round16", "quarter", "semi", "third", "final", "closed"].includes(activePhase)) return true;
    return activePhase !== MATCHDAY_PHASE[matchday];
  }

  async function savePrediction(matchId: string) {
    if (!userId) return;
    const pred = predictions[matchId];
    if (!pred) return;
    const home = parseInt(pred.home, 10);
    const away = parseInt(pred.away, 10);
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      showToast("Introduceți scoruri valide!");
      return;
    }
    setSaving(matchId);
    const { error } = await supabase.from("predictions").upsert(
      { user_id: userId, match_id: matchId, predicted_home: home, predicted_away: away },
      { onConflict: "user_id,match_id" }
    );
    if (error) showToast(`Eroare: ${error.message}`);
    else { 
      setSaved(prev => ({ ...prev, [matchId]: true })); 
      showToast("Salvat!"); 
    }
    setSaving(null);
  }

  async function deletePrediction(matchId: string) {
    if (!userId) return;
    const { error } = await supabase.from("predictions").delete().eq("user_id", userId).eq("match_id", matchId);
    if (error) { showToast(`Eroare: ${error.message}`); return; }
    setPredictions(prev => ({ ...prev, [matchId]: { home: "", away: "" } }));
    setSaved(prev => ({ ...prev, [matchId]: false }));
    showToast("Pronosticul a fost șters");
  }

  const availableGroups = useMemo(() => {
    return [...new Set(
      matches.filter(m => m.matchday?.toString() === filterMatchday && m.group_name).map(m => m.group_name as string)
    )].sort();
  }, [matches, filterMatchday]);

  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      if (m.matchday?.toString() !== filterMatchday) return false;
      if (filterGroup !== "all" && m.group_name !== filterGroup) return false;
      return true;
    });
  }, [matches, filterMatchday, filterGroup]);

  const currentMatchdayLocked = isMatchdayLocked(parseInt(filterMatchday, 10));

  const displayedUsers = selectedUser
    ? otherUsers.filter(u => u.user_id === selectedUser)
    : otherUsers;

  return (
    <div className="min-h-screen bg-[#071327] text-white">

      {/* Toast */}
      {toast && (
        <div className="fixed right-4 top-4 z-50 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 backdrop-blur">
          {toast}
        </div>
      )}

      {/* Banner */}
      <div className="relative h-40 overflow-hidden">
        <Image src="/images/pronosticuri.jpeg" alt="Pronosticuri Grupe" fill className="object-cover object-center" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-[#071327]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-lg">Pronosticuri Grupe</h1>
          <Link href="/groups"
            className="absolute bottom-4 left-4 rounded-full border border-white/20 bg-black/40 px-4 py-1.5 text-sm text-white/80 backdrop-blur-sm transition-all hover:bg-black/60 hover:text-white">
            ← Înapoi
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">

        {/* Filtre comune */}
        <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
          {!phaseLoading && (
            <div className={`rounded-lg border px-3 py-2 text-sm ${
              currentMatchdayLocked
                ? "border-red-500/20 bg-red-500/10 text-red-400"
                : "border-green-500/20 bg-green-500/10 text-green-400"
            }`}>
              {currentMatchdayLocked
                ? `🔒 Etapa ${filterMatchday} este închisă pentru pronosticuri.`
                : `✅ Etapa ${filterMatchday} este deschisă – poți introduce pronosticuri!`}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {["1", "2", "3"].map(md => (
              <button key={md} onClick={() => { setFilterMatchday(md); setFilterGroup("all"); }}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-all ${
                  filterMatchday === md ? "bg-amber-500 text-black" : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}>
                Etapa {md}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilterGroup("all")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                filterGroup === "all" ? "bg-amber-500/70 text-black" : "bg-white/10 text-white/60 hover:bg-white/20"
              }`}>
              Toate grupele
            </button>
            {availableGroups.map(g => (
              <button key={g} onClick={() => setFilterGroup(g)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  filterGroup === g ? "bg-amber-500/70 text-black" : "bg-white/10 text-white/60 hover:bg-white/20"
                }`}>
                Grupa {g}
              </button>
            ))}
          </div>
        </div>

        {/* Tab-uri */}
        <div className="flex rounded-xl border border-white/10 overflow-hidden">
          <button onClick={() => setActiveTab("mine")}
            className={`flex-1 py-2.5 text-sm font-medium transition-all ${
              activeTab === "mine" ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"
            }`}>
            🎯 Pronosticurile mele
          </button>
          <button onClick={() => setActiveTab("others")}
            className={`flex-1 py-2.5 text-sm font-medium transition-all border-l border-white/10 ${
              activeTab === "others" ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"
            }`}>
            👥 Ale celorlalți ({otherUsers.length})
          </button>
        </div>

        {/* ─── TAB MINE ─── */}
        {activeTab === "mine" && (
          loading ? (
            <div className="py-12 text-center text-white/50">Se încarcă meciurile...</div>
          ) : filteredMatches.length === 0 ? (
            <div className="py-12 text-center text-white/50">Niciun meci găsit.</div>
          ) : (
            <div className="space-y-3">
              {filteredMatches.map(match => {
                const pred = predictions[match.id] ?? { home: "", away: "" };
                
                // MODIFICARE: Scoatem `alreadySaved` din lock-ul vizual pentru a permite editări multiple în ferestrele active
                const locked = currentMatchdayLocked || match.is_finished;
                
                // Resetăm starea de text "Salvat" dacă utilizatorul modifică din nou inputurile
                const wasSaved = saved[match.id] && pred.home !== "" && pred.away !== "";

                return (
                  <div key={match.id}
                    className={`overflow-hidden rounded-xl border bg-white/5 ${locked ? "border-white/5 opacity-75" : "border-white/10"}`}>
                    <div className="border-b border-white/5 bg-white/5 px-3 py-1.5">
                      <span className="text-xs text-white/40">
                        Grupa {match.group_name}
                        {match.is_finished && match.home_score !== null && match.away_score !== null && (
                          <span className="ml-2 text-green-400">Rezultat: {match.home_score} – {match.away_score}</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <span className="flex-1 text-right text-sm font-semibold text-white">{match.home_team}</span>
                      <div className="flex items-center gap-2">
                        <input type="number" min={0} max={99} value={pred.home} disabled={locked}
                          onChange={e => {
                            setSaved(prev => ({ ...prev, [match.id]: false })); // resetăm starea de salvat la tastare
                            setPredictions(prev => ({ ...prev, [match.id]: { ...(prev[match.id] ?? { home: "", away: "" }), home: e.target.value } }));
                          }}
                          className="w-10 rounded-lg border border-white/20 bg-gray-900 px-1.5 py-1 text-center text-base font-bold text-white outline-none focus:border-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
                          placeholder="–" />
                        <span className="text-white/40">:</span>
                        <input type="number" min={0} max={99} value={pred.away} disabled={locked}
                          onChange={e => {
                            setSaved(prev => ({ ...prev, [match.id]: false })); // resetăm starea de salvat la tastare
                            setPredictions(prev => ({ ...prev, [match.id]: { ...(prev[match.id] ?? { home: "", away: "" }), away: e.target.value } }));
                          }}
                          className="w-10 rounded-lg border border-white/20 bg-gray-900 px-1.5 py-1 text-center text-base font-bold text-white outline-none focus:border-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
                          placeholder="–" />
                      </div>
                      <span className="flex-1 text-sm font-semibold text-white">{match.away_team}</span>
                      {!locked && (
                        <div className="flex gap-2">
                          <button onClick={() => savePrediction(match.id)} disabled={saving === match.id}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                              wasSaved ? "bg-green-600 text-white" : "bg-amber-500 text-black hover:bg-amber-400"
                            } disabled:opacity-50`}>
                            {saving === match.id ? "..." : wasSaved ? "✓ Salvat" : "Salvează"}
                          </button>
                          <button onClick={() => deletePrediction(match.id)}
                            className="rounded-lg bg-red-600/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500">
                            🗑
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ─── TAB OTHERS ─── */}
        {activeTab === "others" && (
          <div className="space-y-4">
            {/* Selector user */}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setSelectedUser(null)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  !selectedUser ? "bg-white/20 text-white" : "bg-white/10 text-white/60 hover:bg-white/20"
                }`}>
                Toți
              </button>
              {otherUsers.map(u => (
                <button key={u.user_id} onClick={() => setSelectedUser(u.user_id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    selectedUser === u.user_id ? "bg-amber-500 text-black" : "bg-white/10 text-white/60 hover:bg-white/20"
                  }`}>
                  {u.display_name}
                </button>
              ))}
            </div>

            {/* Tabele useri */}
            {loading ? (
              <div className="py-8 text-center text-white/50">Se încarcă...</div>
            ) : otherUsers.length === 0 ? (
              <div className="py-8 text-center text-white/50">Nu există alți jucători cu pronosticuri.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedUsers.map(user => (
                  <div key={user.user_id} className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border-b border-white/10">
                      <div className="h-7 w-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xs font-bold">
                        {user.display_name[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium text-white text-sm">{user.display_name}</span>
                    </div>
                    <div className="divide-y divide-white/5">
                      {filteredMatches.length === 0 ? (
                        <p className="px-4 py-3 text-xs text-white/40">Niciun meci pentru această etapă.</p>
                      ) : filteredMatches.map(match => {
                        const pred = user.predictions[match.id];
                        return (
                          <div key={match.id} className="flex items-center gap-2 px-3 py-2">
                            <div className="flex-1 min-w-0">
                              <span className="text-xs text-white/50 truncate block">
                                {match.home_team} vs {match.away_team}
                              </span>
                              {match.group_name && (
                                <span className="text-xs text-white/25">Grupa {match.group_name}</span>
                              )}
                            </div>
                            {pred ? (
                              <span className="text-sm font-bold text-white bg-white/10 rounded px-2 py-0.5 shrink-0">
                                {pred.home}–{pred.away}
                              </span>
                            ) : (
                              <span className="text-xs text-white/25 shrink-0">–</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
