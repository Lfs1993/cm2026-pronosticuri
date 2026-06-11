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

type PredictionWithMatch = Prediction & {
  match: Match;
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

  if (pred.predicted_home === h && pred.predicted_away === a) {
    return { pts: 3, label: "✅ 3pts" };
  }

  const mw = h > a ? "home" : a > h ? "away" : "draw";
  const pw =
    pred.predicted_home > pred.predicted_away
      ? "home"
      : pred.predicted_home < pred.predicted_away
      ? "away"
      : "draw";

  if (mw === pw) return { pts: 1, label: "🟡 1pt" };

  return { pts: 0, label: "❌ 0" };
}

function normalizeName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default function ProfilePage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [stats, setStats] = useState({ points: 0, exact: 0, outcomes: 0 });
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      if (!user) {
        window.location.href = "/auth/login";
        return;
      }

      setEmail(user.email || "");

      const [profileRes, boardRes, predictionsRes, matchesRes] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("id", user.id).single(),
        supabase.rpc("leaderboard_view"),
        supabase
          .from("predictions")
          .select("user_id, match_id, predicted_home, predicted_away")
          .eq("user_id", user.id),
        supabase.from("matches").select("*").order("order_index"),
      ]);

      const name =
        profileRes.data?.display_name || user.user_metadata?.display_name || "";
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
      setLoadingPredictions(false);
    }

    load();
  }, []);

  async function save() {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) return;

    await supabase.from("profiles").update({ display_name: displayName }).eq("id", user.id);
    setMessage("Profilul a fost actualizat.");
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }

  const userPredictions = useMemo<PredictionWithMatch[]>(() => {
    const mapped = predictions.map((pred) => ({
      ...pred,
      match: matches.find((m) => m.id === pred.match_id) || null,
    }));

    const filtered = mapped.filter(
      (row): row is Prediction & { match: Match } => row.match !== null
    );

    return filtered.sort((a, b) => {
      const stageDiff =
        STAGE_ORDER.indexOf(a.match.stage) - STAGE_ORDER.indexOf(b.match.stage);
      if (stageDiff !== 0) return stageDiff;

      const mdA = a.match.matchday ?? 0;
      const mdB = b.match.matchday ?? 0;
      if (mdA !== mdB) return mdA - mdB;

      const groupA = a.match.group_name ?? "";
      const groupB = b.match.group_name ?? "";
      if (groupA !== groupB) return groupA.localeCompare(groupB);

      return a.match.order_index - b.match.order_index;
    });
  }, [predictions, matches]);

  const groupedByStage = useMemo(() => {
    const grouped: Record<string, PredictionWithMatch[]> = {};

    userPredictions.forEach((row) => {
      const stage = row.match.stage;
      if (!grouped[stage]) grouped[stage] = [];
      grouped[stage].push(row);
    });

    return STAGE_ORDER.filter((stage) => grouped[stage]?.length).map((stage) => ({
      stage,
      label: STAGE_LABELS[stage] ?? stage,
      rows: grouped[stage],
    }));
  }, [userPredictions]);

  const showMilanCrest = [
    "flaviu lazar",
    "lazar flaviu",
    "flaviu-samuel",
    "lazar, flaviu-samuel",
    "lazar flaviu-samuel",
    "flaviu-samuel lazar",
  ].includes(normalizeName(displayName));

  return (
    <main className="min-h-screen bg-[#071327]">
      <AppShell>
        <div className="relative mb-6 h-56 overflow-hidden rounded-3xl border border-white/10">
          <img
            src="/images/cupa-mondiala.jpg"
            alt="Profil"
            className="h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-[#071327]" />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <h1 className="text-4xl font-bold text-white">Profil</h1>
            <p className="mt-2 text-sm text-white/75">
              Puncte live, scoruri exacte și rezultatele tale.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
            <h2 className="text-3xl font-bold">Profil</h2>
            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm text-white/70">Email</label>
                <input className="input" disabled value={email} />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">Numele afișat</label>
                <input
                  className="input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>

              {message ? (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                  {message}
                </div>
              ) : null}

              <div className="flex gap-3">
                <button className="btn-primary" onClick={save}>
                  Salvează profilul
                </button>
                <button className="btn-secondary" onClick={logout}>
                  Logout
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
            <h3 className="text-2xl font-bold">Statisticile tale live</h3>
            <div className="mt-6 grid gap-4">
              <div className="rounded-2xl bg-black/20 p-4">
                <div className="text-sm text-white/70">Puncte totale</div>
                <div className="mt-1 text-3xl font-bold text-fifa-gold">{stats.points}</div>
              </div>
              <div className="rounded-2xl bg-black/20 p-4">
                <div className="text-sm text-white/70">Scoruri exacte</div>
                <div className="mt-1 text-3xl font-bold">{stats.exact}</div>
              </div>
              <div className="rounded-2xl bg-black/20 p-4">
                <div className="text-sm text-white/70">Rezultate corecte</div>
                <div className="mt-1 text-3xl font-bold">{stats.outcomes}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold">Pronosticurile tale</h3>
              <p className="mt-1 text-sm text-white/60">Vezi exact ce ai pus pe fiecare etapă.</p>
            </div>

            {showMilanCrest && (
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg"
                alt="AC Milan"
                className="h-14 w-14 object-contain"
              />
            )}
          </div>

          {loadingPredictions ? (
            <div className="py-10 text-center text-white/50">Se încarcă...</div>
          ) : groupedByStage.length === 0 ? (
            <div className="py-10 text-center text-white/50">Nu ai pronosticuri încă.</div>
          ) : (
            <div className="space-y-8">
              {groupedByStage.map((stageSection) => (
                <div
                  key={stageSection.stage}
                  className="overflow-hidden rounded-2xl border border-white/10"
                >
                  <div className="border-b border-white/10 bg-white/5 px-4 py-3">
                    <h4 className="font-semibold text-white">{stageSection.label}</h4>
                  </div>

                  {stageSection.stage === "groups" ? (
                    <div>
                      {Array.from(new Set(stageSection.rows.map((row) => row.match.matchday ?? 0)))
                        .sort((a, b) => a - b)
                        .map((matchday) => {
                          const rowsForMatchday = stageSection.rows.filter(
                            (row) => (row.match.matchday ?? 0) === matchday
                          );

                          const groups = Array.from(
                            new Set(rowsForMatchday.map((row) => row.match.group_name ?? "-"))
                          ).sort((a, b) => a.localeCompare(b));

                          return (
                            <div key={`groups-md-${matchday}`}>
                              <div className="border-y border-white/10 bg-white/5 px-4 py-2">
                                <p className="text-xs font-medium uppercase tracking-wider text-white/40">
                                  Etapa {matchday}
                                </p>
                              </div>

                              {groups.map((group) => {
                                const rowsForGroup = rowsForMatchday.filter(
                                  (row) => (row.match.group_name ?? "-") === group
                                );

                                return (
                                  <div key={`groups-md-${matchday}-group-${group}`}>
                                    <div className="border-b border-white/10 bg-white/5 px-4 py-2">
                                      <p className="text-xs font-medium uppercase tracking-wider text-white/30">
                                        Grupa {group}
                                      </p>
                                    </div>

                                    <div className="divide-y divide-white/5">
                                      {rowsForGroup.map((row) => {
                                        const result = calcPoints(row, row.match);

                                        return (
                                          <div
                                            key={row.match_id}
                                            className="flex items-center gap-2 px-4 py-2.5"
                                          >
                                            <div className="min-w-0 flex-1">
                                              <span className="block truncate text-xs text-white/50">
                                                {row.match.home_team} vs {row.match.away_team}
                                              </span>
                                              {row.match.is_finished &&
                                                row.match.home_score !== null && (
                                                  <span className="text-xs text-green-400">
                                                    Rezultat: {row.match.home_score}–
                                                    {row.match.away_score}
                                                  </span>
                                                )}
                                            </div>

                                            <span className="shrink-0 text-sm font-bold text-white">
                                              {row.predicted_home}–{row.predicted_away}
                                            </span>

                                            <span className="w-16 shrink-0 text-right text-xs">
                                              {result.label}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div>
                      {Array.from(new Set(stageSection.rows.map((row) => row.match.matchday ?? 0)))
                        .sort((a, b) => a - b)
                        .map((matchday) => {
                          const rowsForMatchday = stageSection.rows.filter(
                            (row) => (row.match.matchday ?? 0) === matchday
                          );

                          return (
                            <div key={`${stageSection.stage}-md-${matchday}`}>
                              <div className="border-y border-white/10 bg-white/5 px-4 py-2">
                                <p className="text-xs font-medium uppercase tracking-wider text-white/40">
                                  {matchday === 0 ? "Meciuri" : `Etapa ${matchday}`}
                                </p>
                              </div>

                              <div className="divide-y divide-white/5">
                                {rowsForMatchday.map((row) => {
                                  const result = calcPoints(row, row.match);

                                  return (
                                    <div
                                      key={row.match_id}
                                      className="flex items-center gap-2 px-4 py-2.5"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <span className="block truncate text-xs text-white/50">
                                          {row.match.home_team} vs {row.match.away_team}
                                        </span>
                                        {row.match.is_finished &&
                                          row.match.home_score !== null && (
                                            <span className="text-xs text-green-400">
                                              Rezultat: {row.match.home_score}–
                                              {row.match.away_score}
                                            </span>
                                          )}
                                      </div>

                                      <span className="shrink-0 text-sm font-bold text-white">
                                        {row.predicted_home}–{row.predicted_away}
                                      </span>

                                      <span className="w-16 shrink-0 text-right text-xs">
                                        {result.label}
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
              ))}
            </div>
          )}
        </div>
      </AppShell>
    </main>
  );
}
