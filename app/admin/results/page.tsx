"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageBanner } from "@/components/ui/page-banner";
import { supabase } from "@/lib/supabase";
import { FIXTURES } from "@/lib/fixtures";

const LABELS: Record<string, string> = {
  groups1: "Etapa 1",
  groups2: "Etapa 2",
  groups3: "Etapa 3",
  round16: "Optimi",
  quarter: "Sferturi",
  semi: "Semifinale",
  third: "Finala mică",
  final: "Finala",
};

type MatchScore = {
  home: string;
  away: string;
};

type PredictionRow = {
  match_id: string;
  user_id: string;
  predicted_home: number;
  predicted_away: number;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
};

type PredictionView = {
  userId: string;
  displayName: string;
  home: number;
  away: number;
};

export default function AdminResultsPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [scores, setScores] = useState<Record<string, MatchScore>>({});
  const [predictionsByMatch, setPredictionsByMatch] = useState<
    Record<string, PredictionView[]>
  >({});
  const [loading, setLoading] = useState(true);

  const grouped = useMemo(() => {
    const all = Array.from(FIXTURES) as any[];

    return {
      groups1: all
        .filter((m) => m.stage === "groups" && m.matchday === 1)
        .sort((a, b) =>
          (a.group_name || "").localeCompare(b.group_name || "")
        ),
      groups2: all
        .filter((m) => m.stage === "groups" && m.matchday === 2)
        .sort((a, b) =>
          (a.group_name || "").localeCompare(b.group_name || "")
        ),
      groups3: all
        .filter((m) => m.stage === "groups" && m.matchday === 3)
        .sort((a, b) =>
          (a.group_name || "").localeCompare(b.group_name || "")
        ),
      round16: all.filter((m) => m.stage === "round16"),
      quarter: all.filter((m) => m.stage === "quarter"),
      semi: all.filter((m) => m.stage === "semi"),
      third: all.filter((m) => m.stage === "third"),
      final: all.filter((m) => m.stage === "final"),
    };
  }, []);

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      if (!user) {
        window.location.href = "/auth/login";
        return;
      }

      const { data: me } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!me?.is_admin) {
        setLoading(false);
        return;
      }

      setIsAdmin(true);

      const [{ data: matchesData }, { data: predictionsData }, { data: profilesData }] =
        await Promise.all([
          supabase.from("matches").select("id, home_score, away_score"),
          supabase
            .from("predictions")
            .select("match_id, user_id, predicted_home, predicted_away"),
          supabase.from("profiles").select("id, display_name"),
        ]);

      const scoreMap: Record<string, MatchScore> = {};
      (matchesData || []).forEach((m: any) => {
        scoreMap[m.id] = {
          home: m.home_score?.toString() ?? "",
          away: m.away_score?.toString() ?? "",
        };
      });
      setScores(scoreMap);

      const profilesMap = new Map<string, string>();
      ((profilesData as ProfileRow[] | null) || []).forEach((p) => {
        profilesMap.set(p.id, p.display_name || "User");
      });

      const predictionMap: Record<string, PredictionView[]> = {};
      ((predictionsData as PredictionRow[] | null) || []).forEach((p) => {
        predictionMap[p.match_id] ??= [];
        predictionMap[p.match_id].push({
          userId: p.user_id,
          displayName: profilesMap.get(p.user_id) || "User",
          home: p.predicted_home,
          away: p.predicted_away,
        });
      });

      Object.keys(predictionMap).forEach((matchId) => {
        predictionMap[matchId].sort((a, b) =>
          a.displayName.localeCompare(b.displayName)
        );
      });

      setPredictionsByMatch(predictionMap);
      setLoading(false);
    }

    load();
  }, []);

  async function save(matchId: string) {
    const value = scores[matchId];
    if (!value) return;

    await supabase
      .from("matches")
      .update({
        home_score: value.home === "" ? null : Number(value.home),
        away_score: value.away === "" ? null : Number(value.away),
        is_finished: value.home !== "" && value.away !== "",
      })
      .eq("id", matchId);

    alert("Rezultatul a fost salvat.");
  }

  function renderPredictions(matchId: string) {
    const items = predictionsByMatch[matchId] || [];

    return (
      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="mb-2 text-sm font-semibold text-white/75">
          Pronosticurile tuturor
        </div>

        {items.length === 0 ? (
          <div className="text-sm text-white/55">
            Nu există pronosticuri încă.
          </div>
        ) : (
          <div className="grid gap-2">
            {items.map((item) => (
              <div
                key={`${matchId}-${item.userId}`}
                className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm"
              >
                <span>{item.displayName}</span>
                <span className="font-semibold text-fifa-gold">
                  {item.home} - {item.away}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderBlock(key: keyof typeof grouped) {
    if (!grouped[key].length) return null;

    return (
      <section className="mt-6">
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <h3 className="text-2xl font-bold">{LABELS[key]}</h3>
        </div>

        <div className="mt-4 grid gap-4">
          {grouped[key].map((match: any) => (
            <div
              key={match.id}
              className="rounded-3xl border border-white/10 bg-white/5 p-4"
            >
              <div className="font-semibold">
                {match.home_team} vs {match.away_team}
              </div>

              <div className="mt-1 text-sm text-white/60">
                {match.stage === "groups"
                  ? `Grupa ${match.group_name}`
                  : LABELS[match.stage]}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <input
                  className="input max-w-[90px] text-center"
                  type="number"
                  min="0"
                  value={scores[match.id]?.home ?? ""}
                  onChange={(e) =>
                    setScores((prev) => ({
                      ...prev,
                      [match.id]: {
                        home: e.target.value,
                        away: prev[match.id]?.away ?? "",
                      },
                    }))
                  }
                />

                <span>-</span>

                <input
                  className="input max-w-[90px] text-center"
                  type="number"
                  min="0"
                  value={scores[match.id]?.away ?? ""}
                  onChange={(e) =>
                    setScores((prev) => ({
                      ...prev,
                      [match.id]: {
                        home: prev[match.id]?.home ?? "",
                        away: e.target.value,
                      },
                    }))
                  }
                />

                <button
                  className="btn-primary"
                  onClick={() => save(match.id)}
                >
                  Salvează rezultat
                </button>
              </div>

              {renderPredictions(match.id)}
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#071327]">
        <AppShell>
          <PageBanner
            src="/images/clasament.webp"
            alt="Admin"
            title="Admin"
            subtitle="Se încarcă..."
          />
        </AppShell>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-[#071327]">
        <AppShell>
          <PageBanner
            src="/images/clasament.webp"
            alt="Admin"
            title="Admin"
            subtitle="Doar adminul poate modifica rezultatele."
          />
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-lg">
            Doar adminul poate modifica rezultatele.
          </div>
        </AppShell>
      </main>
    );
