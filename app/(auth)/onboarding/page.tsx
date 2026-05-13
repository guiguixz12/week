'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft, Check, Loader2, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { saveGoals, saveWeekPlan } from '@/lib/store'
import { saveProfile } from '@/lib/profile'
import { Input } from '@/components/ui/Input'
import { NutriWeekLogo } from '../_components'
import { cn } from '@/lib/utils'
import type { Objetivo } from '@/types/database'
import type { WeekPlan } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type NivelAtividade = 'sedentario' | 'leve' | 'moderado' | 'muito_ativo' | 'extremo'

interface OnboardingData {
  objetivo:       Objetivo | ''
  peso:           string
  altura:         string
  nivelAtividade: NivelAtividade
  restricoes:     string[]
  outraRestricao: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const OBJECTIVES: { value: Objetivo; emoji: string; title: string; description: string }[] = [
  { value: 'emagrecer',    emoji: '🔥', title: 'Emagrecer',      description: 'Reduzir gordura corporal com deficit calórico inteligente' },
  { value: 'manter',       emoji: '⚖️', title: 'Manter peso',    description: 'Manter peso atual e melhorar a qualidade da dieta' },
  { value: 'ganhar_massa', emoji: '💪', title: 'Ganhar massa',   description: 'Aumentar massa muscular com superávit controlado' },
]

const ACTIVITY_LEVELS: { value: NivelAtividade; label: string; description: string }[] = [
  { value: 'sedentario',  label: 'Sedentário',          description: 'Pouco ou nenhum exercício' },
  { value: 'leve',        label: 'Levemente ativo',      description: 'Exercício 1–3x por semana' },
  { value: 'moderado',    label: 'Moderadamente ativo',  description: 'Exercício 3–5x por semana' },
  { value: 'muito_ativo', label: 'Muito ativo',          description: 'Exercício 6–7x por semana' },
  { value: 'extremo',     label: 'Extremamente ativo',   description: 'Atleta ou trabalho físico intenso' },
]

const RESTRICOES_OPTIONS = [
  { id: 'vegetariano', emoji: '🌿', label: 'Vegetariano' },
  { id: 'vegano',      emoji: '🌱', label: 'Vegano' },
  { id: 'sem_gluten',  emoji: '🌾', label: 'Sem glúten' },
  { id: 'sem_lactose', emoji: '🥛', label: 'Sem lactose' },
  { id: 'sem_nozes',   emoji: '🥜', label: 'Sem nozes/amendoim' },
  { id: 'halal',       emoji: '🕌', label: 'Halal' },
  { id: 'kosher',      emoji: '✡️', label: 'Kosher' },
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
        const done   = step < current
        const active = step === current
        return (
          <div key={step} className="flex items-center gap-2">
            <div className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all',
              done   ? 'bg-brand text-white'                    : '',
              active ? 'bg-brand text-white ring-4 ring-brand/20' : '',
              !done && !active ? 'bg-gray-100 text-gray-400'   : '',
            )}>
              {done ? <Check className="h-4 w-4" /> : step}
            </div>
            {step < TOTAL_STEPS && (
              <div className={cn('h-0.5 w-8 rounded-full transition-all', done ? 'bg-brand' : 'bg-gray-200')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Loading screen ───────────────────────────────────────────────────────────

const LOADING_MESSAGES = [
  'Analisando seu perfil…',
  'Calculando suas metas calóricas…',
  'Selecionando alimentos ideais para você…',
  'Montando o cardápio da semana…',
  'Ajustando macronutrientes…',
  'Quase pronto…',
]

function GeneratingScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8 text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-brand/10">
        <Sparkles className="h-10 w-10 text-brand animate-pulse" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900">Gerando seu plano personalizado</h2>
      <p className="mt-2 text-sm text-gray-500 max-w-xs">
        Nossa IA está criando um plano alimentar feito especialmente para você.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
        <p className="text-sm font-medium text-brand">{message}</p>
      </div>
      <p className="mt-6 text-xs text-gray-400">
        Isso pode levar até 1 minuto. Não feche esta página.
      </p>
    </div>
  )
}

// ─── n8n helpers ─────────────────────────────────────────────────────────────

function getCurrentWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  return monday.toISOString().split('T')[0]
}

async function callN8nTrigger(payload: Record<string, unknown>): Promise<{ plan?: WeekPlan; weekStart?: string }> {
  const res = await fetch('/api/n8n/trigger', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })

  if (!res.ok && res.status !== 202) return {}

  const json = await res.json() as { ok?: boolean; data?: unknown; weekStart?: string; timeout?: boolean }

  // n8n responded synchronously with a plan
  if (json.data) {
    const data = json.data as Record<string, unknown>
    // Try WeekPlan format
    if (data.days) return { plan: data as unknown as WeekPlan, weekStart: json.weekStart }
    // Try "dias" format (same as generate-plan)
    if (data.dias || (data.plan as Record<string, unknown>)?.days) {
      return { plan: (data.plan ?? data) as WeekPlan, weekStart: json.weekStart }
    }
  }

  return { weekStart: json.weekStart }
}

async function pollForPlan(userId: string, maxAttempts = 20): Promise<WeekPlan | null> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 3000))
    const res = await fetch(`/api/webhook/receive-plan?userId=${encodeURIComponent(userId)}`)
    const json = await res.json() as { plan: WeekPlan | null }
    if (json.plan) return json.plan
  }
  return null
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
  const router = useRouter()

  const [step,        setStep]        = useState(1)
  const [data,        setData]        = useState<OnboardingData>(INITIAL)
  const [loading,     setLoading]     = useState(false)
  const [generating,  setGenerating]  = useState(false)
  const [genMessage,  setGenMessage]  = useState(LOADING_MESSAGES[0])
  const [error,       setError]       = useState('')

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

  function cycleMessage() {
    let idx = 0
    return setInterval(() => {
      idx = (idx + 1) % LOADING_MESSAGES.length
      setGenMessage(LOADING_MESSAGES[idx])
    }, 4000)
  }

  async function handleFinish() {
    setError('')
    setLoading(true)
    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser()
      if (userErr || !user) throw new Error('Sessão expirada. Faça login novamente.')

      const metas = calcMetas(data)

      // ── Save to Supabase ──────────────────────────────────────────────────
      await supabase.from('users').update({
        objetivo:      data.objetivo as Objetivo,
        peso:          Number(data.peso)   || null,
        altura:        Number(data.altura) || null,
        calorias_meta: metas.calorias,
        proteina_meta: metas.proteina,
      }).eq('id', user.id)

      // ── Save to localStorage ──────────────────────────────────────────────
      saveGoals({
        peso:          Number(data.peso)   || 0,
        peso_meta:     0,
        altura:        Number(data.altura) || 0,
        idade:         0,
        sexo:          'masculino',
        atividade:     data.nivelAtividade === 'muito_ativo' ? 'intenso' : data.nivelAtividade === 'extremo' ? 'atleta' : data.nivelAtividade as 'sedentario' | 'leve' | 'moderado',
        objetivo:      data.objetivo as 'emagrecer' | 'manter' | 'ganhar_massa',
        calorias_meta: metas.calorias,
        proteina_meta: metas.proteina,
        carbs_meta:    Math.round((metas.calorias * 0.45) / 4),
        gordura_meta:  Math.round((metas.calorias * 0.25) / 9),
      })

      saveProfile({
        onboarding_done:     true,
        nome:                user.user_metadata?.nome ?? '',
        objetivo:            data.objetivo as 'emagrecer' | 'manter' | 'ganhar_massa',
        peso_atual_kg:       Number(data.peso)   || 0,
        altura_cm:           Number(data.altura) || 0,
        nivel_atividade:     data.nivelAtividade === 'muito_ativo' ? 'intenso' : data.nivelAtividade === 'extremo' ? 'atleta' : data.nivelAtividade as 'sedentario' | 'leve' | 'moderado',
        preferencias:        data.restricoes.filter(r => ['vegetariano','vegano','sem_gluten','sem_lactose','low_carb','cetogenico'].includes(r)) as ('vegetariano' | 'vegano' | 'sem_gluten' | 'sem_lactose' | 'low_carb' | 'cetogenico')[],
        alimentos_nao_gosta: data.outraRestricao,
        metas: {
          kcal_dia:            metas.calorias,
          proteina_g:          metas.proteina,
          carbs_g:             Math.round((metas.calorias * 0.45) / 4),
          gordura_g:           Math.round((metas.calorias * 0.25) / 9),
          editado_manualmente: false,
        },
      })

      setLoading(false)

      // ── If no n8n configured, go straight to dashboard ───────────────────
      // Check by calling the trigger; if it returns 503, skip
      setGenerating(true)
      const msgInterval = cycleMessage()

      try {
        const triggerPayload = {
          userId:        user.id,
          email:         user.email,
          nome:          user.user_metadata?.nome ?? '',
          objetivo:      data.objetivo,
          peso:          Number(data.peso)   || 0,
          altura:        Number(data.altura) || 0,
          nivelAtividade: data.nivelAtividade,
          restricoes:    data.restricoes,
          outraRestricao: data.outraRestricao,
          calorias_meta: metas.calorias,
          proteina_meta: metas.proteina,
        }

        const { plan, weekStart } = await callN8nTrigger(triggerPayload)

        // n8n responded synchronously with the plan
        if (plan && weekStart) {
          saveWeekPlan({ ...plan, weekStart })
          clearInterval(msgInterval)
          router.push('/dashboard')
          return
        }

        // n8n is async — poll for the plan (up to ~60 seconds)
        setGenMessage('Aguardando resposta do servidor…')
        const polledPlan = await pollForPlan(user.id)

        clearInterval(msgInterval)

        if (polledPlan) {
          const ws = polledPlan.weekStart || getCurrentWeekStart()
          saveWeekPlan({ ...polledPlan, weekStart: ws })
        }

        router.push('/dashboard')
      } catch {
        clearInterval(msgInterval)
        // n8n failed or not configured — proceed without plan
        router.push('/dashboard')
      }
    } catch (err: unknown) {
      setLoading(false)
      setGenerating(false)
      const msg = err instanceof Error ? err.message : 'Erro ao salvar perfil'
      setError(msg)
    }
  }

  // ── Generating screen ─────────────────────────────────────────────────────
  if (generating) {
    return <GeneratingScreen message={genMessage} />
  }

  const stepLabels = ['Objetivo', 'Dados físicos', 'Restrições']

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
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

          {/* ── Step 1: Objetivo ─────────────────────────────────────────── */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900">Qual é o seu objetivo principal?</h2>
              <p className="mt-1 text-sm text-gray-500">Usaremos isso para calcular suas metas calóricas ideais.</p>
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
                      <p className={cn('font-semibold', data.objetivo === obj.value ? 'text-brand' : 'text-gray-800')}>
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

          {/* ── Step 2: Dados físicos ────────────────────────────────────── */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900">Seus dados físicos</h2>
              <p className="mt-1 text-sm text-gray-500">Usados para calcular seu gasto calórico diário.</p>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <Input label="Peso atual" type="number" value={data.peso}
                  onChange={e => update('peso', e.target.value)} placeholder="75" hint="kg" min="30" max="300" />
                <Input label="Altura" type="number" value={data.altura}
                  onChange={e => update('altura', e.target.value)} placeholder="175" hint="cm" min="100" max="250" />
              </div>
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">Nível de atividade física</label>
                <div className="space-y-2">
                  {ACTIVITY_LEVELS.map(level => (
                    <button key={level.value} type="button"
                      onClick={() => update('nivelAtividade', level.value)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all',
                        data.nivelAtividade === level.value
                          ? 'border-brand bg-brand/5'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                      )}
                    >
                      <div>
                        <p className={cn('text-sm font-semibold', data.nivelAtividade === level.value ? 'text-brand' : 'text-gray-800')}>
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
              {data.peso && data.altura && (
                <div className="mt-5 rounded-xl bg-brand/5 border border-brand/15 p-4">
                  <p className="text-xs font-semibold text-brand uppercase tracking-wider mb-2">Suas metas estimadas</p>
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

          {/* ── Step 3: Restrições ──────────────────────────────────────── */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900">Restrições alimentares</h2>
              <p className="mt-1 text-sm text-gray-500">
                Selecione todas que se aplicam. Pode pular se não houver.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-2">
                {RESTRICOES_OPTIONS.map(r => {
                  const selected = data.restricoes.includes(r.id)
                  return (
                    <button key={r.id} type="button" onClick={() => toggleRestricao(r.id)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all',
                        selected ? 'border-brand bg-brand/5' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                      )}
                    >
                      <span className="text-lg">{r.emoji}</span>
                      <span className={cn('text-sm font-medium', selected ? 'text-brand' : 'text-gray-700')}>
                        {r.label}
                      </span>
                      {selected && <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-brand" />}
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
            <button type="button" onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors">
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>
          ) : <div />}

          {step < TOTAL_STEPS ? (
            <button type="button" onClick={() => setStep(s => s + 1)} disabled={!canAdvance()}
              className="flex items-center gap-1.5 rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-600 disabled:opacity-40 disabled:pointer-events-none">
              Próximo
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" onClick={handleFinish} disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-600 disabled:opacity-60">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Salvando…' : 'Gerar meu plano 🎉'}
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
