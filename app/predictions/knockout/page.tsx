// app/predictions/knockout/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useActivePhase } from '@/lib/useActivePhase'

type Match = {
  id: string
  stage: string
  order_index: number
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  is_finished: boolean
}

type PredictionMap = Record<string, { home: string; away: string }>

// Fără round32!
const KNOCKOUT_STAGES = [
  { key: 'round16', label: 'Optimi de finală'  },
  { key: 'quarter', label: 'Sferturi de finală' },
  { key: 'semi',    label: 'Semifinale'          },
  { key: 'third',   label: 'Finala mică'          },
  { key: 'final',   label: 'Finala'               },
]

export default function PredictionsKnockoutPage() {
  const router = useRouter()
  const { activePhase, loading: phaseLoading } = useActivePhase()

  const [userId, setUserId] = useState<string | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<PredictionMap>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [filterStage, setFilterStage] = useState<string>('round16')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUserId(user.id)

      const validStages = KNOCKOUT_STAGES.map(s => s.key)

      const [matchRes, predRes] = await Promise.all([
        supabase.from('matches').select('*').in('stage', validStages).order('order_index'),
        supabase.from('predictions').select('match_id, predicted_home, predicted_away').eq('user_id', user.id),
      ])

      if (matchRes.data) setMatches(matchRes.data)

      if (predRes.data) {
        const map: PredictionMap = {}
        predRes.data.forEach((p: { match_id: string; predicted_home: number; predicted_away: number }) => {
          map[p.match_id] = { home: p.predicted_home.toString(), away: p.predicted_away.toString() }
        })
        setPredictions(map)
      }

      setLoading(false)
    }
    init()
  }, [])

  // Sincronizare filtru cu faza activă
  useEffect(() => {
    if (!activePhase) return
    const exists = KNOCKOUT_STAGES.find(s => s.key === activePhase)
    if (exists) setFilterStage(activePhase)
  }, [activePhase])

  function isStageLocked(stageKey: string): boolean {
    if (!activePhase) return true
    if (['groups1', 'groups2', 'groups3', 'closed'].includes(activePhase)) return true
    return activePhase !== stageKey
  }

  async function savePrediction(matchId: string) {
    if (!userId) return
    const pred = predictions[matchId]
    if (!pred) return
    const home = parseInt(pred.home)
    const away = parseInt(pred.away)
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      alert('Introduceți scoruri valide!')
      return
    }

    setSaving(matchId)
    const { error } = await supabase
      .from('predictions')
      .upsert(
        { user_id: userId, match_id: matchId, predicted_home: home, predicted_away: away },
        { onConflict: 'user_id,match_id' }
      )

    if (error) alert(`Eroare: ${error.message}`)
    else setSaved(prev => ({ ...prev, [matchId]: true }))
    setSaving(null)
  }

  const currentStageInfo = KNOCKOUT_STAGES.find(s => s.key === filterStage)
  const filteredMatches = matches.filter(m => m.stage === filterStage)
  const currentStageLocked = isStageLocked(filterStage)

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Banner */}
      <div className="relative h-40 overflow-hidden">
        <img src="/images/pronosticuri.jpeg" alt="Pronosticuri Eliminatorii"
          className="h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-gray-950" />
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-lg">
            Pronosticuri Faze Eliminatorii
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">

        {/* Filtre sub banner */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">

          {!phaseLoading && (
            <div className={`rounded-lg px-3 py-2 text-sm ${
              currentStageLocked
                ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                : 'bg-green-500/10 border border-green-500/20 text-green-400'
            }`}>
              {currentStageLocked
                ? `🔒 ${currentStageInfo?.label ?? filterStage} este închisă pentru pronosticuri.`
                : `✅ ${currentStageInfo?.label ?? filterStage} este deschisă – poți introduce pronosticuri!`}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {KNOCKOUT_STAGES.map(stage => (
              <button key={stage.key} onClick={() => setFilterStage(stage.key)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-all ${
                  filterStage === stage.key ? 'bg-amber-500 text-black' : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}>
                {stage.label}
              </button>
            ))}
          </div>
        </div>

        {/* Meciuri */}
        {loading ? (
          <div className="text-center py-12 text-white/50">Se încarcă meciurile...</div>
        ) : filteredMatches.length === 0 ? (
          <div className="text-center py-12 text-white/50">
            Meciurile pentru această rundă nu au fost generate încă.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMatches.map(match => {
              const pred = predictions[match.id] ?? { home: '', away: '' }
              const locked = currentStageLocked || match.is_finished
              const wasSaved = saved[match.id]

              return (
                <div key={match.id}
                  className={`rounded-xl border bg-white/5 overflow-hidden ${
                    locked ? 'border-white/5 opacity-75' : 'border-white/10'
                  }`}>

                  {match.is_finished && match.home_score !== null && (
                    <div className="px-3 py-1 bg-white/5 border-b border-white/5">
                      <span className="text-xs text-green-400">
                        Rezultat final: {match.home_score} – {match.away_score}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-3 px-4 py-3">
                    <span className="flex-1 text-right font-semibold text-white text-sm">
                      {match.home_team || 'TBD'}
                    </span>

                    <div className="flex items-center gap-2">
                      <input type="number" min={0} max={99} value={pred.home} disabled={locked}
                        onChange={e => setPredictions(prev => ({ ...prev, [match.id]: { ...prev[match.id], home: e.target.value } }))}
                        className="w-10 rounded-lg border border-white/20 bg-gray-900 px-1.5 py-1 text-center text-base font-bold text-white focus:border-amber-500 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                        placeholder="–" />
                      <span className="text-white/40">:</span>
                      <input type="number" min={0} max={99} value={pred.away} disabled={locked}
                        onChange={e => setPredictions(prev => ({ ...prev, [match.id]: { ...prev[match.id], away: e.target.value } }))}
                        className="w-10 rounded-lg border border-white/20 bg-gray-900 px-1.5 py-1 text-center text-base font-bold text-white focus:border-amber-500 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                        placeholder="–" />
                    </div>

                    <span className="flex-1 font-semibold text-white text-sm">
                      {match.away_team || 'TBD'}
                    </span>

                    {!locked && (
                      <button onClick={() => savePrediction(match.id)} disabled={saving === match.id}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                          wasSaved ? 'bg-green-600 text-white' : 'bg-amber-500 text-black hover:bg-amber-400'
                        } disabled:opacity-50`}>
                        {saving === match.id ? '...' : wasSaved ? '✓ Salvat' : 'Salvează'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
