'use client'

import { useEffect, useState } from 'react'
import { Loader2, RefreshCw, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DayPlan, MealSlot, MealType, WeekPlan } from '@/types'

// ─── API response types ───────────────────────────────────────────────────────

interface APIMeal {
  nome: string
  calorias: number
  proteina: number
  carbs: number
  gordura: number
  ingredientes: string[]
}

interface APIDay {
  dia: string
  cafe_da_manha: APIMeal
  lanche: APIMeal
  almoco: APIMeal
  jantar: APIMeal
}

export interface APIPlan {
  dias: APIDay[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toLocalISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function caloriesLabel(cals: number): string {
  if (cals < 1700) return 'Emagrecimento'
  if (cals <= 2300) return 'Manutenção'
  return 'Ganho de massa'
}

function getObjetivo(cals: number): 'emagrecer' | 'manter' | 'ganhar_massa' {
  if (cals < 1700) return 'emagrecer'
  if (cals <= 2300) return 'manter'
  return 'ganhar_massa'
}

export function toWeekPlan(api: APIPlan, weekStart: Date): WeekPlan {
  const MEAL_MAP: Array<[keyof Omit<APIDay, 'dia'>, MealType]> = [
    ['cafe_da_manha', 'breakfast'],
    ['lanche',        'snack'],
    ['almoco',        'lunch'],
    ['jantar',        'dinner'],
  ]

  const days: DayPlan[] = api.dias.map((apiDay, i) => {
    const date = toLocalISODate(addDays(weekStart, i))
    const meals: Partial<Record<MealType, MealSlot>> = {}

    for (const [apiKey, mealType] of MEAL_MAP) {
      const m = apiDay[apiKey] as APIMeal | undefined
      if (m?.nome) {
        meals[mealType] = {
          id: `ai-${date}-${mealType}`,
          mealType,
          name: m.nome,
          calories: m.calorias,
          macros: { protein: m.proteina, carbs: m.carbs, fat: m.gordura },
        }
      }
    }

    return { date, meals }
  })

  return {
    id: `ai-${Date.now()}`,
    userId: 'ai',
    weekStart: toLocalISODate(weekStart),
    days,
  }
}

// ─── Preference options ───────────────────────────────────────────────────────

const PREFERENCES = [
  { id: 'vegetariano', label: 'Vegetariano' },
  { id: 'sem glúten',  label: 'Sem glúten'  },
  { id: 'low carb',    label: 'Low carb'    },
  { id: 'sem lactose', label: 'Sem lactose' },
] as const

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean
  onClose: () => void
  weekStart: Date
  onPlanGenerated: (plan: WeekPlan) => void
  onGeneratingChange: (generating: boolean) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AIGeneratorDrawer({
  isOpen,
  onClose,
  weekStart,
  onPlanGenerated,
  onGeneratingChange,
}: Props) {
  const [rendered, setRendered] = useState(false)
  const [visible,  setVisible]  = useState(false)

  const [calories,    setCalories]    = useState(2000)
  const [prefs,       setPrefs]       = useState<Set<string>>(new Set())
  const [avoidFoods,  setAvoidFoods]  = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [hasGenerated, setHasGenerated] = useState(false)

  // Dual-state open/close animation
  useEffect(() => {
    if (isOpen) {
      setRendered(true)
      const f = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(f)
    } else {
      setVisible(false)
      const t = setTimeout(() => setRendered(false), 300)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  function togglePref(id: string) {
    setPrefs(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  async function generate() {
    setError('')
    setLoading(true)
    onGeneratingChange(true)

    const restricoes = Array.from(prefs)
    if (avoidFoods.trim()) {
      restricoes.push(`não gosto de: ${avoidFoods.trim()}`)
    }

    try {
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objetivo:      getObjetivo(calories),
          calorias_meta: calories,
          proteina_meta: Math.round((calories * 0.30) / 4),
          restricoes,
        }),
      })

      const json = (await res.json()) as { plan?: APIPlan; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Erro ao gerar plano.')

      if (!json.plan) throw new Error('Resposta inválida da API.')

      const weekPlan = toWeekPlan(json.plan, weekStart)
      onPlanGenerated(weekPlan)
      setHasGenerated(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido.')
    } finally {
      setLoading(false)
      onGeneratingChange(false)
    }
  }

  if (!rendered) return null

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={() => { if (!loading) onClose() }}
        className={cn(
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300',
          visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Drawer panel */}
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-white shadow-2xl',
          'transition-transform duration-300 ease-in-out',
          visible ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-100 px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10">
              <Sparkles className="h-4 w-4 text-brand" />
            </div>
            <h2 className="text-base font-bold text-gray-900">Gerador IA</h2>
          </div>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); if (!loading) onClose() }}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable form */}
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-7">

          {/* ── Calorie slider ──────────────────────────────────────────── */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700">
                Calorias diárias
              </label>
              <span className="text-sm font-bold text-brand">
                {calories.toLocaleString('pt-BR')} kcal
              </span>
            </div>

            <input
              type="range"
              min={1200}
              max={3500}
              step={50}
              value={calories}
              onChange={e => setCalories(Number(e.target.value))}
              disabled={loading}
              className="w-full cursor-pointer accent-brand disabled:opacity-50"
            />

            <div className="mt-1 flex justify-between">
              <span className="text-[11px] text-gray-400">1.200</span>
              <span className="text-[11px] text-gray-400">3.500</span>
            </div>

            <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-2">
              <span className="text-[11px] text-gray-500">Objetivo detectado:</span>
              <span className="text-[11px] font-semibold text-brand">
                {caloriesLabel(calories)}
              </span>
            </div>
          </div>

          {/* ── Preference toggles ──────────────────────────────────────── */}
          <div>
            <p className="mb-3 text-sm font-semibold text-gray-700">
              Preferências alimentares
            </p>
            <div className="flex flex-wrap gap-2">
              {PREFERENCES.map(p => (
                <button
                  key={p.id}
                  onClick={() => togglePref(p.id)}
                  disabled={loading}
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all',
                    prefs.has(p.id)
                      ? 'border-brand bg-brand text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-brand hover:text-brand',
                    loading && 'cursor-not-allowed opacity-50',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Avoid foods ─────────────────────────────────────────────── */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Alimentos que não gosto
            </label>
            <textarea
              value={avoidFoods}
              onChange={e => setAvoidFoods(e.target.value)}
              disabled={loading}
              placeholder="Ex: fígado, chuchu, jiló..."
              rows={3}
              className="w-full resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-gray-50 disabled:opacity-50"
            />
          </div>

          {/* ── Feedback messages ───────────────────────────────────────── */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {hasGenerated && !loading && !error && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              Plano gerado! O calendário foi atualizado com suas refeições.
            </div>
          )}

          {/* ── Loading hint ────────────────────────────────────────────── */}
          {loading && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-brand/20 bg-brand/5 py-6 text-center">
              <Loader2 className="h-7 w-7 animate-spin text-brand" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Gerando seu plano…</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Isso pode levar alguns segundos
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="shrink-0 space-y-2.5 border-t border-gray-100 px-5 py-4">
          <button
            onClick={generate}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-semibold text-white transition-all hover:bg-brand-600 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando…
              </>
            ) : hasGenerated ? (
              <>
                <RefreshCw className="h-4 w-4" />
                Regenerar plano
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Gerar plano
              </>
            )}
          </button>

          {hasGenerated && !loading && (
            <button
              onClick={onClose}
              className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              Fechar e usar plano
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
