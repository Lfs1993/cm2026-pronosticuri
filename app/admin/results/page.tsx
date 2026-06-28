// lib/useActivePhase.ts
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type ActivePhase =
  | 'groups1'
  | 'groups2'
  | 'groups3'
  | 'round32'
  | 'round16'
  | 'quarter'
  | 'semi'
  | 'third'
  | 'final'
  | 'closed'

export const PHASE_LABELS: Record<ActivePhase, string> = {
  groups1: 'Etapa 1 (Grupe)',
  groups2: 'Etapa 2 (Grupe)',
  groups3: 'Etapa 3 (Grupe)',
  round32: 'Saisprezecimi de finală',
  round16: 'Optimi de finală',
  quarter: 'Sferturi de finală',
  semi:    'Semifinale',
  third:   'Finala mică',
  final:   'Finala',
  closed:  '🔒 Închis',
}

export function useActivePhase() {
  const [activePhase, setActivePhaseState] = useState<ActivePhase | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPhase() {
      const { data, error } = await supabase
        .from('prediction_control')
        .select('active_phase')
        .eq('id', 1)
        .single()
      if (error) setError(error.message)
      else setActivePhaseState(data.active_phase as ActivePhase)
      setLoading(false)
    }
    fetchPhase()

    const channel = supabase
      .channel('prediction_control_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'prediction_control' },
        (payload) => {
          setActivePhaseState(payload.new.active_phase as ActivePhase)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function setActivePhase(phase: ActivePhase): Promise<boolean> {
    const { error } = await supabase
      .from('prediction_control')
      .update({ active_phase: phase, updated_at: new Date().toISOString() })
      .eq('id', 1)
    if (error) { setError(error.message); return false }
    setActivePhaseState(phase)
    return true
  }

  return { activePhase, loading, error, setActivePhase }
}
