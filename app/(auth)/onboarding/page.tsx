'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft, Check, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/Input'
import { NutriWeekLogo } from '../_components'
import { cn } from '@/lib/utils'
import type { Objetivo } from '@/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

type NivelAtividade = 'sedentario' | 'leve' | 'moderado' | 'muito_ativo' | 'extremo'

interface OnboardingData {
  // Step 1
  objetivo: Objetivo | ''
  // Step 2
  peso:           string
  altura:         string
  nivelAtividade: NivelAtividade
  // Step 3
  restricoes: string[]
  outraRestricao: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const OBJECTIVES: { value: Objetivo; emoji: string; title: string; description: string }[] = [
  {
    value:       'emagrecer',
    emoji:       '🔥',
    title:       'Emagrecer',
    description: 'Reduzir gordura corporal com deficit calórico inteligente',
  },
  {
    value:       'manter',
    emoji:       '⚖️',
    title:       'Manter peso',
    description: 'Manter peso atual e melhorar a qualidade da dieta',
  },
  {
    value:       'ganhar_massa',
    emoji:       '💪',
    title:       'Ganhar massa',
    description: 'Aumentar massa muscular com superávit controlado',
  },
]

const ACTIVITY_LEVELS: { value: NivelAtividade; label: string; description: string }[] = [
  { value: 'sedentario',  label: 'Sedentário',           description: 'Pouco ou nenhum exercício' },
  { value: 'leve',        label: 'Levemente ativo',       description: 'Exercício 1–3x por semana' },
  { value: 'moderado',    label: 'Moderadamente ativo',   description: 'Exercício 3–5x por semana' },
  { value: 'muito_ativo', label: 'Muito ativo',           description: 'Exercício 6–7x por semana' },
  { value: 'extremo',     label: 'Extremamente ativo',    description: 'Atleta ou trabalho físico intenso' },
]

const RESTRICOES_OPTIONS = [
  { id: 'vegetariano',  emoji: '🌿', label: 'Vegetariano' },
  { id: 'vegano',       emoji: '🌱', label: 'Vegano' },
  { id: 'sem_gluten',   emoji: '🌾', label: 'Sem glúten' },
  { id: 'sem_lactose',  emoji: '🥛', label: 'Sem lactose' },
  { id: 'sem_nozes',    emoji: '🥜', label: 'Sem nozes/amendoim' },
  { id: 'halal',        emoji: '🕌', label: 'Halal' },
  { id: 'kosher',       emoji: '✡️', label: 'Kosher' },
]

const TOTAL_STEPS = 3

// ─── Calorie / protein estimation ────────────────────────────────────────────

const activityMultipliers: Record<NivelAtividade, number> = {
  sedentario:  1.2,
  leve:        1.375,
  moderado:    1.55,
  muito_ativo: 1.725,
  extremo:     1.9,
}

const objectiveAdjustment: Record<Objetivo, { cals: number; protG: number }> = {
  emagrecer:    { cals: -500, protG: 2.0 },
  manter:       { cals: 0,    protG: 1.6 },
  ganhar_massa: { cals: +300, protG: 2.2 },
}

function calcMetas(data: OnboardingData): { calorias: number; proteina: number } {
  const peso   = Number(data.peso)   || 75
  const altura = Number(data.altura) || 170
  const obj    = data.objetivo as Objetivo

  // Simplified Mifflin-St Jeor (gender-neutral average)
  const bmr  = 10 * peso + 6.25 * altura - 500
  const tdee = bmr * (activityMultipliers[data.nivelAtividade] ?? 1.55)
  const adj  = objectiveAdjustment[obj] ?? { cals: 0, protG: 1.6 }

  return {
    calorias: Math.max(1200, Math.round(tdee + adj.cals)),
    proteina: Math.round(peso * adj.protG),
  }
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => {
        const step = i + 1
        const done = step < current
        const active = step === current
        return (
          <div key={step} className="flex items-center gap-2">
            <div className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all',
              done   ? 'bg-brand text-white'        : '',
              active ? 'bg-brand text-white ring-4 ring-brand/20' : '',
              !done && !active ? 'bg-gray-100 text-gray-400' : '',
            )}>
              {done ? <Check className="h-4 w-4" /> : step}
            </div>
            {step < TOTAL_STEPS && (
              <div className={cn(
                'h-0.5 w-8 rounded-full transition-all',
                done ? 'bg-brand' : 'bg-gray-200',
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const INITIAL: OnboardingData = {
  objetivo:       '',
  peso:           '',
  altura:         '',
  nivelAtividade: 'moderado',
  restricoes:     [],
  outraRestricao: '',
}

export default function OnboardingPage() {
  const router  = useRouter()
  const [step,    setStep]    = useState(1)
  const [data,    setData]    = useState<OnboardingData>(INITIAL)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  function update<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) {
    setData(d => ({ ...d, [key]: value }))
  }

  function toggleRestricao(id: string) {
    setData(d => ({
      ...d,
      restricoes: d.restricoes.includes(id)
        ? d.restricoes.filter(r => r !== id)
        : [...d.restricoes, id],
    }))
  }

  function canAdvance(): boolean {
    if (step === 1) return data.objetivo !== ''
    if (step === 2) return data.peso !== '' && data.altura !== ''
    return true
  }

  async function handleFinish() {
    setError('')
    setLoading(true)
    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser()
      if (userErr || !user) throw new Error('Sessão expirada. Faça login novamente.')

      const metas = calcMetas(data)

      const { error: updateErr } = await supabase
        .from('users')
        .update({
          objetivo:      data.objetivo as Objetivo,
          peso:          Number(data.peso)   || null,
          altura:        Number(data.altura) || null,
          calorias_meta: metas.calorias,
          proteina_meta: metas.proteina,
        })
        .eq('id', user.id)

      if (updateErr) throw updateErr
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar perfil'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const stepLabels = ['Objetivo', 'Dados físicos', 'Restrições']

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">

      {/* Card */}
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <NutriWeekLogo size="md" dark />
        </div>

        {/* Step indicator */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <StepIndicator current={step} />
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            Passo {step} de {TOTAL_STEPS} — {stepLabels[step - 1]}
          </p>
        </div>

        {/* Card body */}
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">

          {/* ── Step 1: Objetivo ───────────────────────────────────────────── */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Qual é o seu objetivo principal?
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Usaremos isso para calcular suas metas calóricas ideais.
              </p>

              <div className="mt-6 space-y-3">
                {OBJECTIVES.map(obj => (
                  <button
                    key={obj.value}
                    type="button"
                    onClick={() => update('objetivo', obj.value)}
                    className={cn(
                      'flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all',
                      data.objetivo === obj.value
                        ? 'border-brand bg-brand/5 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                    )}
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-2xl">
                      {obj.emoji}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'font-semibold',
                        data.objetivo === obj.value ? 'text-brand' : 'text-gray-800',
                      )}>
                        {obj.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{obj.description}</p>
                    </div>
                    {data.objetivo === obj.value && (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Dados físicos ──────────────────────────────────────── */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900">Seus dados físicos</h2>
              <p className="mt-1 text-sm text-gray-500">
                Usados para calcular seu gasto calórico diário.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <Input
                  label="Peso atual"
                  type="number"
                  value={data.peso}
                  onChange={e => update('peso', e.target.value)}
                  placeholder="75"
                  hint="kg"
                  min="30"
                  max="300"
                />
                <Input
                  label="Altura"
                  type="number"
                  value={data.altura}
                  onChange={e => update('altura', e.target.value)}
                  placeholder="175"
                  hint="cm"
                  min="100"
                  max="250"
                />
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Nível de atividade física
                </label>
                <div className="space-y-2">
                  {ACTIVITY_LEVELS.map(level => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => update('nivelAtividade', level.value)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all',
                        data.nivelAtividade === level.value
                          ? 'border-brand bg-brand/5'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                      )}
                    >
                      <div>
                        <p className={cn(
                          'text-sm font-semibold',
                          data.nivelAtividade === level.value ? 'text-brand' : 'text-gray-800',
                        )}>
                          {level.label}
                        </p>
                        <p className="text-xs text-gray-400">{level.description}</p>
                      </div>
                      {data.nivelAtividade === level.value && (
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview das metas */}
              {data.peso && data.altura && (
                <div className="mt-5 rounded-xl bg-brand/5 border border-brand/15 p-4">
                  <p className="text-xs font-semibold text-brand uppercase tracking-wider mb-2">
                    Suas metas estimadas
                  </p>
                  {(() => {
                    const m = calcMetas(data)
                    return (
                      <div className="flex gap-6">
                        <div>
                          <p className="text-xl font-bold text-gray-900">{m.calorias}</p>
                          <p className="text-xs text-gray-500">kcal / dia</p>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-gray-900">{m.proteina}g</p>
                          <p className="text-xs text-gray-500">proteína / dia</p>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Restrições ─────────────────────────────────────────── */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Restrições alimentares
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Selecione todas que se aplicam a você. Pode pular se não houver.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-2">
                {RESTRICOES_OPTIONS.map(r => {
                  const selected = data.restricoes.includes(r.id)
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleRestricao(r.id)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all',
                        selected
                          ? 'border-brand bg-brand/5'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                      )}
                    >
                      <span className="text-lg">{r.emoji}</span>
                      <span className={cn(
                        'text-sm font-medium',
                        selected ? 'text-brand' : 'text-gray-700',
                      )}>
                        {r.label}
                      </span>
                      {selected && (
                        <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-brand" />
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Outras restrições ou preferências
                </label>
                <textarea
                  value={data.outraRestricao}
                  onChange={e => update('outraRestricao', e.target.value)}
                  placeholder="Ex: alergia a frutos do mar, intolerância a ovos…"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>
          ) : (
            <div />
          )}

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              disabled={!canAdvance()}
              className="flex items-center gap-1.5 rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-600 disabled:opacity-40 disabled:pointer-events-none"
            >
              Próximo
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-600 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Salvando…' : 'Começar agora 🎉'}
            </button>
          )}
        </div>

        {step === 3 && (
          <p className="mt-4 text-center text-xs text-gray-400">
            Você pode alterar todas essas informações nas configurações do seu perfil.
          </p>
        )}
      </div>
    </div>
  )
}
