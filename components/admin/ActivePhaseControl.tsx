"use client";

import { ActivePhase, PHASE_LABELS, useActivePhase } from "@/lib/useActivePhase";

const PHASE_ORDER: ActivePhase[] = [
  "groups1",
  "groups2",
  "groups3",
  "round32",
  "round16",
  "quarter",
  "semi",
  "third",
  "final",
  "closed",
];

const PHASE_COLORS: Record<ActivePhase, string> = {
  groups1: "bg-blue-600 hover:bg-blue-500",
  groups2: "bg-blue-700 hover:bg-blue-600",
  groups3: "bg-blue-800 hover:bg-blue-700",
  round32: "bg-amber-600 hover:bg-amber-500",
  round16: "bg-purple-700 hover:bg-purple-600",
  quarter: "bg-violet-700 hover:bg-violet-600",
  semi: "bg-fuchsia-700 hover:bg-fuchsia-600",
  third: "bg-orange-700 hover:bg-orange-600",
  final: "bg-yellow-600 hover:bg-yellow-500",
  closed: "bg-gray-700 hover:bg-gray-600",
};

export default function ActivePhaseControl() {
  const { activePhase, loading, error, setActivePhase } = useActivePhase();

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <p className="text-sm text-white/50">Se încarcă faza activă...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
        <p className="text-sm text-red-400">Eroare: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-white">
          Control Etapă Activă
        </h2>

        {activePhase && (
          <span className="rounded-full border border-green-500/30 bg-green-600/20 px-3 py-1 text-xs font-medium text-green-400">
            Activ acum: {PHASE_LABELS[activePhase]}
          </span>
        )}
      </div>

      <p className="text-sm text-white/60">
        Apasă un buton pentru a deschide sau închide o etapă. Modificarea se aplică instant pentru toți userii.
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {PHASE_ORDER.map((phase) => {
          const isActive = activePhase === phase;

          return (
            <button
              key={phase}
              type="button"
              onClick={() => setActivePhase(phase)}
              className={`
                relative rounded-lg px-3 py-2.5 text-sm font-medium text-white
                transition-all duration-150
                ${PHASE_COLORS[phase]}
                ${
                  isActive
                    ? "scale-105 shadow-lg ring-2 ring-white/40"
                    : "opacity-60 hover:opacity-100"
                }
              `}
            >
              {isActive && (
                <span className="absolute -right-1.5 -top-1.5 h-3 w-3 rounded-full border-2 border-gray-900 bg-green-400" />
              )}

              {PHASE_LABELS[phase]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
