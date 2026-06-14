"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { supabase } from "@/lib/supabase";

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
};

type PredictionWithMatch = Prediction & { match: Match };

type OtherUser = {
  user_id: string;
  display_name: string;
  predictions: Prediction[];
};

const STAGE_LABELS: Record<string, string> = {
  groups: "Grupe",
  round16: "Optimi",
  quarter: "Sferturi",
  semi: "Semifinale",
  third: "Finala mică",
  final: "Finala",
};

const STAGE_ORDER = ["groups", "round16", "quarter", "semi", "third", "final"];

function calcPoints(pred: Prediction, match: Match): { pts: number; label: string } {
  if (!match.is_finished) return { pts: 0, label: "⏳" };
  const h = match.home_score!;
  const a = match.away_score!;
  if (pred.predicted_home === h && pred.predicted_away === a) return { pts: 3, label: "✅ 3pts" };
  const mw = h > a ? "home" : a > h ? "away" : "draw";
  const pw = pred.predicted_home > pred.predicted_away ? "home"
    : pred.predicted_home < pred.predicted_away ? "away" : "draw";
  if (mw === pw) return { pts: 1, label: "🟡 1pt" };
  return { pts: 0, label: "❌ 0" };
}

function normalizeName(name: string) {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

export default function ProfilePage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [stats, setStats] = useState({ points: 0, exact: 0, outcomes: 0 });
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [allPredictions, setAllPredictions] = useState<Prediction[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; display_name: string }[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(true);

  // Filtre
  const [activeTab, setActiveTab] = useState<"mine" | "others">("mine");
  const [filterStage, setFilterStage] = useState<string>("groups");
  const [filterMatchday, setFilterMatchday] = useState<string>("1");
  const [filterOthersStage, setFilterOthersStage] = useState<string>("groups");
  const [filterOthersMatchday, setFilterOthersMatchday] = useState<string>("1");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) { window.location.href = "/auth/login"; return; }

      setEmail(user.email || "");
      setUserId(user.id);

      const [profileRes, boardRes, predictionsRes, matchesRes, allPredRes, profilesRes] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("id", user.id).single(),
        supabase.rpc("leaderboard_view"),
        supabase.from("predictions").select("user_id, match_id, predicted_home, predicted_away").eq("user_id", user.id),
        supabase.from("matches").select("*").order("order_index"),
        supabase.from("predictions").select("user_id, match_id, predicted_home, predicted_away"),
        supabase.from("profiles").select("id, display_name"),
      ]);

      const name = profileRes.data?.display_name || user.user_metadata?.display_name || "";
      setDisplayName(name);

      const mine = (boardRes.data || []).find((x: any) => x.user_id === user.id);
      if (mine) {
        setStats({
          points: Number(mine.points || 0),
          exact: Number(mine.exact_hits || 0),
          outcomes: Number(mine.outcome_hits || 0),
        });
      }

      setPredictions((predictionsRes.data || []) as Prediction[]);
      setMatches((matchesRes.data || []) as Match[]);
      setAllPredictions((allPredRes.data || []) as Prediction[]);
      setProfiles((profilesRes.data || []) as { id: string; display_name: string }[]);
      setLoadingPredictions(false);
    }
    load();
  }, []);

  async function save() {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) return;
    await supabase.from("profiles").update({ display_name: displayName }).eq("id", user.id);
    setMessage("Profilul a fost actualizat!");
    setTimeout(() => setMessage(null), 3000);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }

  // Pronosticurile mele
  const userPredictions = useMemo<PredictionWithMatch[]>(() => {
    return predictions
      .map(pred => ({ ...pred, match: matches.find(m => m.id === pred.match_id) || null }))
      .filter((row): row is PredictionWithMatch => row.match !== null)
      .sort((a, b) => {
        const sd = STAGE_ORDER.indexOf(a.match.stage) - STAGE_ORDER.indexOf(b.match.stage);
        if (sd !== 0) return sd;
        const md = (a.match.matchday ?? 0) - (b.match.matchday ?? 0);
        if (md !== 0) return md;
        return a.match.order_index - b.match.order_index;
      });
  }, [predictions, matches]);

  // Filtrare pronosticuri mele
  const filteredMyPreds = useMemo(() => {
    return userPredictions.filter(row => {
      if (row.match.stage !== filterStage) return false;
      if (filterStage === "groups" && row.match.matchday?.toString() !== filterMatchday) return false;
      return true;
    });
  }, [userPredictions, filterStage, filterMatchday]);

  // Alți useri
  const otherUsers = useMemo<OtherUser[]>(() => {
    const map: Record<string, OtherUser> = {};
    allPredictions.forEach(p => {
      if (p.user_id === userId) return;
      if (!map[p.user_id]) {
        const prof = profiles.find(pr => pr.id === p.user_id);
        map[p.user_id] = { user_id: p.user_id, display_name: prof?.display_name ?? "User", predictions: [] };
      }
      map[p.user_id].predictions.push(p);
    });
    return Object.values(map).sort((a, b) => a.display_name.localeCompare(b.display_name));
  }, [allPredictions, userId, profiles]);

  // Meciuri filtrate pentru tab alți useri
  const matchesForOthers = useMemo(() => {
    return matches.filter(m => {
      if (m.stage !== filterOthersStage) return false;
      if (filterOthersStage === "groups" && m.matchday?.toString() !== filterOthersMatchday) return false;
      return true;
    });
  }, [matches, filterOthersStage, filterOthersMatchday]);

  const showMilanCrest = ["flaviu lazar","lazar flaviu","flaviu-samuel","lazar flaviu-samuel","flaviu-samuel lazar"].includes(normalizeName(displayName));

  const availableMatchdays = [...new Set(matches.filter(m => m.stage === filterStage && m.matchday).map(m => m.matchday!.toString()))].sort();
  const availableOthersMatchdays = [...new Set(matches.filter(m => m.stage === filterOthersStage && m.matchday).map(m => m.matchday!.toString()))].sort();

  const displayedUser = selectedUser ? otherUsers.find(u => u.user_id === selectedUser) : null;

  return (
    <main className="min-h-screen bg-[#071327]">
      <AppShell>

        {/* Banner */}
        <div className="relative mb-6 h-48 overflow-hidden rounded-3xl border border-white/10">
          <img src="/images/cupa-mondiala.jpg" alt="Profil" className="h-full w-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-[#071327]" />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <h1 className="text-3xl font-bold text-white drop-shadow-lg">
              {displayName || "Profil"}
            </h1>
            <p className="mt-1 text-sm text-white/70">Puncte live, scoruri exacte și rezultatele tale.</p>
          </div>
        </div>

        {/* Profil + Statistici */}
        <div className="grid gap-4 lg:grid-cols-2 mb-6">

          {/* Card Profil */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-lg">
                {displayName?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div>
                <p className="font-semibold text-white">{displayName || "—"}</p>
                <p className="text-xs text-white/50">{email}</p>
              </div>
              {showMilanCrest && (
                <img src="https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg"
                  alt="AC Milan" className="ml-auto h-10 w-10 object-contain" />
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-white/60">Numele afișat</label>
                <input className="input w-full" value={displayName} onChange={e => setDisplayName(e.target.value)} />
              </div>
              {message && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                  {message}
                </div>
              )}
              <div className="flex gap-2">
                <button className="btn-primary text-sm py-2 px-4" onClick={save}>Salvează</button>
                <button className="btn-secondary text-sm py-2 px-4" onClick={logout}>Logout</button>
              </div>
            </div>
          </div>

          {/* Card Statistici */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="font-semibold text-white mb-4">📊 Statistici live</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-black/20 border border-white/5 p-3 text-center">
                <div className="text-xs text-white/50 mb-1">Puncte</div>
                <div className="text-2xl font-bold text-amber-400">{stats.points}</div>
              </div>
              <div className="rounded-xl bg-black/20 border border-white/5 p-3 text-center">
                <div className="text-xs text-white/50 mb-1">Exacte</div>
                <div className="text-2xl font-bold text-green-400">{stats.exact}</div>
              </div>
              <div className="rounded-xl bg-black/20 border border-white/5 p-3 text-center">
                <div className="text-xs text-white/50 mb-1">Corecte</div>
                <div className="text-2xl font-bold text-blue-400">{stats.outcomes}</div>
              </div>
            </div>

            {/* Mini progres */}
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs text-white/50">
                <span>Pronosticuri date</span>
                <span>{predictions.length} meciuri</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10">
                <div className="h-1.5 rounded-full bg-amber-400 transition-all"
                  style={{ width: `${Math.min((predictions.length / Math.max(matches.length, 1)) * 100, 100)}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Tab-uri Pronosticuri */}
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">

          {/* Tab header */}
          <div className="flex border-b border-white/10">
            <button onClick={() => setActiveTab("mine")}
              className={`flex-1 py-3 text-sm font-medium transition-all ${
                activeTab === "mine" ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"
              }`}>
              🎯 Pronosticurile mele
            </button>
            <button onClick={() => setActiveTab("others")}
              className={`flex-1 py-3 text-sm font-medium transition-all ${
                activeTab === "others" ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"
              }`}>
              👥 Pronosticurile celorlalți
            </button>
          </div>

          {/* ─── TAB MINE ─── */}
          {activeTab === "mine" && (
            <div className="p-4 space-y-4">

              {/* Filtre */}
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {STAGE_ORDER.map(stage => (
                    <button key={stage} onClick={() => { setFilterStage(stage); setFilterMatchday("1"); }}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                        filterStage === stage ? "bg-amber-500 text-black" : "bg-white/10 text-white/60 hover:bg-white/20"
                      }`}>
                      {STAGE_LABELS[stage]}
                    </button>
                  ))}
                </div>
                {filterStage === "groups" && (
                  <div className="flex gap-2">
                    {availableMatchdays.map(md => (
                      <button key={md} onClick={() => setFilterMatchday(md)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                          filterMatchday === md ? "bg-blue-500/80 text-white" : "bg-white/10 text-white/60 hover:bg-white/20"
                        }`}>
                        Etapa {md}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Lista meciuri */}
              {loadingPredictions ? (
                <div className="py-8 text-center text-white/50">Se încarcă...</div>
              ) : filteredMyPreds.length === 0 ? (
                <div className="py-8 text-center text-white/50">Nu ai pronosticuri pentru această etapă.</div>
              ) : (
                <div className="divide-y divide-white/5 rounded-xl border border-white/10 overflow-hidden">
                  {filteredMyPreds.map(row => {
                    const result = calcPoints(row, row.match);
                    return (
                      <div key={row.match_id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors">
                        <div className="flex-1 min-w-0">
                          <span className="block text-sm text-white truncate">
                            {row.match.home_team} <span className="text-white/40">vs</span> {row.match.away_team}
                          </span>
                          {row.match.is_finished && row.match.home_score !== null && (
                            <span className="text-xs text-green-400">
                              Rezultat: {row.match.home_score}–{row.match.away_score}
                            </span>
                          )}
                        </div>
                        <span className="shrink-0 text-sm font-bold text-white bg-white/10 rounded-lg px-2 py-0.5">
                          {row.predicted_home}–{row.predicted_away}
                        </span>
                        <span className="w-16 shrink-0 text-right text-xs">{result.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── TAB OTHERS ─── */}
          {activeTab === "others" && (
            <div className="p-4 space-y-4">

              {/* Filtre */}
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {STAGE_ORDER.map(stage => (
                    <button key={stage} onClick={() => { setFilterOthersStage(stage); setFilterOthersMatchday("1"); setSelectedUser(null); }}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                        filterOthersStage === stage ? "bg-amber-500 text-black" : "bg-white/10 text-white/60 hover:bg-white/20"
                      }`}>
                      {STAGE_LABELS[stage]}
                    </button>
                  ))}
                </div>
                {filterOthersStage === "groups" && (
                  <div className="flex gap-2">
                    {availableOthersMatchdays.map(md => (
                      <button key={md} onClick={() => { setFilterOthersMatchday(md); setSelectedUser(null); }}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                          filterOthersMatchday === md ? "bg-blue-500/80 text-white" : "bg-white/10 text-white/60 hover:bg-white/20"
                        }`}>
                        Etapa {md}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selectare user */}
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
              {loadingPredictions ? (
                <div className="py-8 text-center text-white/50">Se încarcă...</div>
              ) : otherUsers.length === 0 ? (
                <div className="py-8 text-center text-white/50">Nu există alți jucători cu pronosticuri.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(selectedUser ? otherUsers.filter(u => u.user_id === selectedUser) : otherUsers).map(user => {
                    const totalPts = matchesForOthers.reduce((sum, match) => {
                      const pred = user.predictions.find(p => p.match_id === match.id);
                      if (!pred) return sum;
                      return sum + calcPoints(pred, match).pts;
                    }, 0);

                    return (
                      <div key={user.user_id} className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 border-b border-white/10">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xs font-bold">
                              {user.display_name[0]?.toUpperCase()}
                            </div>
                            <span className="font-medium text-white text-sm">{user.display_name}</span>
                          </div>
                          <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-xs font-bold text-amber-400">
                            {totalPts} pts
                          </span>
                        </div>

                        <div className="divide-y divide-white/5">
                          {matchesForOthers.length === 0 ? (
                            <p className="px-4 py-3 text-xs text-white/40">Niciun meci pentru această etapă.</p>
                          ) : matchesForOthers.map(match => {
                            const pred = user.predictions.find(p => p.match_id === match.id);
                            const result = pred ? calcPoints(pred, match) : null;
                            return (
                              <div key={match.id} className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors">
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs text-white/50 truncate block">
                                    {match.home_team} vs {match.away_team}
                                  </span>
                                  {match.is_finished && match.home_score !== null && (
                                    <span className="text-xs text-green-400">{match.home_score}–{match.away_score}</span>
                                  )}
                                </div>
                                {pred ? (
                                  <span className="text-xs font-bold text-white bg-white/10 rounded px-1.5 py-0.5 shrink-0">
                                    {pred.predicted_home}–{pred.predicted_away}
                                  </span>
                                ) : (
                                  <span className="text-xs text-white/20 shrink-0">–</span>
                                )}
                                <span className="text-xs shrink-0 w-14 text-right">
                                  {result ? result.label : <span className="text-white/20">–</span>}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

      </AppShell>
    </main>
  );
}
