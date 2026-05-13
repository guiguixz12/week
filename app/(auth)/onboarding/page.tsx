'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft, Check, Loader2, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { saveGoals, saveWeekPlan } from '@/lib/store'
import { saveProfile } from '@/lib/profile'
import { diasToWeekPlan } from '@/lib/pending-plans'
import { Input } from '@/components/ui/Input'
import { NutriWeekLogo } from '../_components'
import { cn } from '@/lib/utils'
import type { Objetivo } from '@/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

type NivelAtividade = 'sedentario' | 'leve' | 'moderado' | 'muito_ativo' | 'extremo'

interface OnboardingData {
  objetivo:         Objetivo | ''
  peso:             string
  altura:           string
  nivelAtividade:   NivelAtividade
  alimentosEmCasa:  string[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const OBJECTIVES: { value: Objetivo; emoji: string; title: string; description: string }[] = [
  { value: 'emagrecer',    emoji: '🔥', title: 'Emagrecer',    description: 'Reduzir gordura corporal com deficit calórico inteligente' },
  { value: 'manter',       emoji: '⚖️', title: 'Manter peso',  description: 'Manter peso atual e melhorar a qualidade da dieta' },
  { value: 'ganhar_massa', emoji: '💪', title: 'Ganhar massa', description: 'Aumentar massa muscular com superávit controlado' },
]

const ACTIVITY_LEVELS: { value: NivelAtividade; label: string; description: string }[] = [
  { value: 'sedentario',  label: 'Sedentário',          description: 'Pouco ou nenhum exercício' },
  { value: 'leve',        label: 'Levemente ativo',      description: 'Exercício 1–3x por semana' },
  { value: 'moderado',    label: 'Moderadamente ativo',  description: 'Exercício 3–5x por semana' },
  { value: 'muito_ativo', label: 'Muito ativo',          description: 'Exercício 6–7x por semana' },
  { value: 'extremo',     label: 'Extremamente ativo',   description: 'Atleta ou trabalho físico intenso' },
]

const ALIMENTOS_CATEGORIAS = [
  {
    label: 'Proteínas',
    emoji: '🥩',
    items: [
      { id: 'Frango',              label: 'Frango' },
      { id: 'Carne moída',         label: 'Carne moída' },
      { id: 'Ovos',                label: 'Ovos' },
      { id: 'Atum (lata)',         label: 'Atum (lata)' },
      { id: 'Sardinha (lata)',     label: 'Sardinha (lata)' },
      { id: 'Peixe',               label: 'Peixe' },
      { id: 'Feijão',              label: 'Feijão' },
      { id: 'Lentilha',            label: 'Lentilha' },
      { id: 'Grão-de-bico',        label: 'Grão-de-bico' },
      { id: 'Presunto/Peito peru', label: 'Presunto/Peito peru' },
    ],
  },
  {
    label: 'Carboidratos',
    emoji: '🍚',
    items: [
      { id: 'Arroz',          label: 'Arroz' },
      { id: 'Macarrão',       label: 'Macarrão' },
      { id: 'Pão',            label: 'Pão' },
      { id: 'Batata',         label: 'Batata' },
      { id: 'Batata-doce',    label: 'Batata-doce' },
      { id: 'Aveia',          label: 'Aveia' },
      { id: 'Tapioca',        label: 'Tapioca' },
      { id: 'Mandioca/Aipim', label: 'Mandioca/Aipim' },
      { id: 'Granola',        label: 'Granola' },
    ],
  },
  {
    label: 'Legumes e Verduras',
    emoji: '🥦',
    items: [
      { id: 'Alface',     label: 'Alface' },
      { id: 'Tomate',     label: 'Tomate' },
      { id: 'Cenoura',    label: 'Cenoura' },
      { id: 'Cebola',     label: 'Cebola' },
      { id: 'Alho',       label: 'Alho' },
      { id: 'Brócolis',   label: 'Brócolis' },
      { id: 'Abobrinha',  label: 'Abobrinha' },
      { id: 'Espinafre',  label: 'Espinafre' },
      { id: 'Beterraba',  label: 'Beterraba' },
      { id: 'Couve',      label: 'Couve' },
      { id: 'Pepino',     label: 'Pepino' },
    ],
  },
  {
    label: 'Frutas',
    emoji: '🍎',
    items: [
      { id: 'Banana',    label: 'Banana' },
      { id: 'Maçã',      label: 'Maçã' },
      { id: 'Laranja',   label: 'Laranja' },
      { id: 'Mamão',     label: 'Mamão' },
      { id: 'Abacate',   label: 'Abacate' },
      { id: 'Morango',   label: 'Morango' },
      { id: 'Limão',     label: 'Limão' },
      { id: 'Melancia',  label: 'Melancia' },
      { id: 'Manga',     label: 'Manga' },
    ],
  },
  {
    label: 'Laticínios',
    emoji: '🥛',
    items: [
      { id: 'Leite',       label: 'Leite' },
      { id: 'Queijo',      label: 'Queijo' },
      { id: 'Iogurte',     label: 'Iogurte' },
      { id: 'Requeijão',   label: 'Requeijão' },
      { id: 'Manteiga',    label: 'Manteiga' },
    ],
  },
  {
    label: 'Gorduras e Temperos',
    emoji: '🫒',
    items: [
      { id: 'Azeite',              label: 'Azeite' },
      { id: 'Óleo de cozinha',     label: 'Óleo de cozinha' },
      { id: 'Sal e temperos',      label: 'Sal e temperos' },
    ],
  },
]

const TOTAL_STEPS = 3

// ─── Calorie estimation ───────────────────────────────────────────────────────

const activityMultipliers: Record<NivelAtividade, number> = {
  sedentario: 1.2, leve: 1.375, moderado: 1.55, muito_ativo: 1.725, extremo: 1.9,
}
const objectiveAdjustment: Record<Objetivo, { cals: number; protG: number }> = {
  emagrecer: { cals: -500, protG: 2.0 }, manter: { cals: 0, protG: 1.6 }, ganhar_massa: { cals: +300, protG: 2.2 },
}

function calcMetas(data: OnboardingData) {
  const peso = Number(data.peso) || 75, altura = Number(data.altura) || 170
  const obj = data.objetivo as Objetivo
  const bmr = 10 * peso + 6.25 * altura - 500
  const tdee = bmr * (activityMultipliers[data.nivelAtividade] ?? 1.55)
  const adj = objectiveAdjustment[obj] ?? { cals: 0, protG: 1.6 }
  return { calorias: Math.max(1200, Math.round(tdee + adj.cals)), proteina: Math.round(peso * adj.protG) }
}

function getCurrentWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  return monday.toISOString().split('T')[0]
}

// ─── Plan generator ───────────────────────────────────────────────────────────
// Tries n8n first (if configured), falls back to internal OpenAI API.

interface DiaAPI {
  dia?: string
  cafe_da_manha?: { nome: string; calorias: number; proteina: number; carbs: number; gordura: number }
  lanche?:        { nome: string; calorias: number; proteina: number; carbs: number; gordura: number }
  almoco?:        { nome: string; calorias: number; proteina: number; carbs: number; gordura: number }
  jantar?:        { nome: string; calorias: number; proteina: number; carbs: number; gordura: number }
}

async function generatePlan(params: {
  objetivo: string; calorias_meta: number; proteina_meta: number
  alimentos_em_casa: string[]; userId: string; weekStart: string
}) {
  // 1. Try n8n if configured
  const n8nRes = await fetch('/api/n8n/trigger', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  if (n8nRes.ok) {
    const n8nJson = await n8nRes.json() as { ok?: boolean; data?: unknown; weekStart?: string }
    if (n8nJson.ok && n8nJson.data) {
      const d = n8nJson.data as Record<string, unknown>
      const dias = (d.dias ?? (d.plan as Record<string, unknown>)?.dias) as DiaAPI[] | undefined
      if (dias?.length) return diasToWeekPlan(params.userId, params.weekStart, dias)
    }
  }

  // 2. Fallback: internal OpenAI API
  const aiRes = await fetch('/api/generate-plan', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      objetivo:          params.objetivo,
      calorias_meta:     params.calorias_meta,
      proteina_meta:     params.proteina_meta,
      alimentos_em_casa: params.alimentos_em_casa,
    }),
  })

  if (!aiRes.ok) return null

  const aiJson = await aiRes.json() as { plan?: { dias: DiaAPI[] } }
  if (!aiJson.plan?.dias?.length) return null

  return diasToWeekPlan(params.userId, params.weekStart, aiJson.plan.dias)
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => {
        const step = i + 1, done = step < current, active = step === current
        return (
          <div key={step} className="flex items-center gap-2">
            <div className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all',
              done ? 'bg-brand text-white' : active ? 'bg-brand text-white ring-4 ring-brand/20' : 'bg-gray-100 text-gray-400',
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

// ─── Generating screen ────────────────────────────────────────────────────────

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
        Nossa IA está criando um cardápio feito especialmente para você.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
        <p className="text-sm font-medium text-brand">{message}</p>
      </div>
      <p className="mt-6 text-xs text-gray-400">Isso pode levar até 1 minuto. Não feche esta página.</p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const INITIAL: OnboardingData = {
  objetivo: '', peso: '', altura: '', nivelAtividade: 'moderado', alimentosEmCasa: [],
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step,       setStep]       = useState(1)
  const [data,       setData]       = useState<OnboardingData>(INITIAL)
  const [loading,    setLoading]    = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genMessage, setGenMessage] = useState(LOADING_MESSAGES[0])
  const [error,      setError]      = useState('')

  function update<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) {
    setData(d => ({ ...d, [key]: value }))
  }
  function toggleAlimento(id: string) {
    setData(d => ({
      ...d,
      alimentosEmCasa: d.alimentosEmCasa.includes(id)
        ? d.alimentosEmCasa.filter(a => a !== id)
        : [...d.alimentosEmCasa, id],
    }))
  }
  function canAdvance() {
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
      const weekStart = getCurrentWeekStart()

      // Save to Supabase
      await supabase.from('users').update({
        objetivo:      data.objetivo as Objetivo,
        peso:          Number(data.peso)   || null,
        altura:        Number(data.altura) || null,
        calorias_meta: metas.calorias,
        proteina_meta: metas.proteina,
      }).eq('id', user.id)

      // Save goals to localStorage
      const atividadeMap: Record<NivelAtividade, 'sedentario' | 'leve' | 'moderado' | 'intenso' | 'atleta'> = {
        sedentario: 'sedentario', leve: 'leve', moderado: 'moderado', muito_ativo: 'intenso', extremo: 'atleta',
      }
      saveGoals({
        peso: Number(data.peso) || 0, peso_meta: 0, altura: Number(data.altura) || 0,
        idade: 0, sexo: 'masculino', atividade: atividadeMap[data.nivelAtividade],
        objetivo: data.objetivo as 'emagrecer' | 'manter' | 'ganhar_massa',
        calorias_meta: metas.calorias, proteina_meta: metas.proteina,
        carbs_meta: Math.round((metas.calorias * 0.45) / 4),
        gordura_meta: Math.round((metas.calorias * 0.25) / 9),
      })
      saveProfile({
        onboarding_done: true,
        nome:            user.user_metadata?.nome ?? '',
        objetivo:        data.objetivo as 'emagrecer' | 'manter' | 'ganhar_massa',
        peso_atual_kg:   Number(data.peso)   || 0,
        altura_cm:       Number(data.altura) || 0,
        nivel_atividade: atividadeMap[data.nivelAtividade],
        preferencias:        [],
        alimentos_nao_gosta: '',
        metas: {
          kcal_dia: metas.calorias, proteina_g: metas.proteina,
          carbs_g: Math.round((metas.calorias * 0.45) / 4),
          gordura_g: Math.round((metas.calorias * 0.25) / 9),
          editado_manualmente: false,
        },
      })

      setLoading(false)
      setGenerating(true)

      // Cycle loading messages
      let idx = 0
      const msgInterval = setInterval(() => {
        idx = (idx + 1) % LOADING_MESSAGES.length
        setGenMessage(LOADING_MESSAGES[idx])
      }, 4000)

      try {
        const plan = await generatePlan({
          objetivo:          data.objetivo,
          calorias_meta:     metas.calorias,
          proteina_meta:     metas.proteina,
          alimentos_em_casa: data.alimentosEmCasa,
          userId:            user.id,
          weekStart,
        })

        clearInterval(msgInterval)

        if (plan) {
          saveWeekPlan({ ...plan, weekStart })
        }
      } catch {
        clearInterval(msgInterval)
        // Plan generation failed — user goes to dashboard and plans manually
      }

      router.push('/dashboard')
    } catch (err: unknown) {
      setLoading(false)
      setGenerating(false)
      setError(err instanceof Error ? err.message : 'Erro ao salvar perfil')
    }
  }

  if (generating) return <GeneratingScreen message={genMessage} />

  const stepLabels = ['Objetivo', 'Dados físicos', 'O que tenho em casa']

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-lg">

        <div className="mb-8 flex justify-center">
          <NutriWeekLogo size="md" dark />
        </div>

        <div className="mb-8 flex flex-col items-center gap-3">
          <StepIndicator current={step} />
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            Passo {step} de {TOTAL_STEPS} — {stepLabels[step - 1]}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">

          {/* Step 1 */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900">Qual é o seu objetivo principal?</h2>
              <p className="mt-1 text-sm text-gray-500">Usaremos isso para calcular suas metas calóricas ideais.</p>
              <div className="mt-6 space-y-3">
                {OBJECTIVES.map(obj => (
                  <button key={obj.value} type="button" onClick={() => update('objetivo', obj.value)}
                    className={cn(
                      'flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all',
                      data.objetivo === obj.value ? 'border-brand bg-brand/5 shadow-sm' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                    )}>
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-2xl">{obj.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className={cn('font-semibold', data.objetivo === obj.value ? 'text-brand' : 'text-gray-800')}>{obj.title}</p>
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

          {/* Step 2 */}
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
                    <button key={level.value} type="button" onClick={() => update('nivelAtividade', level.value)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all',
                        data.nivelAtividade === level.value ? 'border-brand bg-brand/5' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                      )}>
                      <div>
                        <p className={cn('text-sm font-semibold', data.nivelAtividade === level.value ? 'text-brand' : 'text-gray-800')}>{level.label}</p>
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
              {data.peso && data.altura && (() => {
                const m = calcMetas(data)
                return (
                  <div className="mt-5 rounded-xl bg-brand/5 border border-brand/15 p-4">
                    <p className="text-xs font-semibold text-brand uppercase tracking-wider mb-2">Suas metas estimadas</p>
                    <div className="flex gap-6">
                      <div><p className="text-xl font-bold text-gray-900">{m.calorias}</p><p className="text-xs text-gray-500">kcal / dia</p></div>
                      <div><p className="text-xl font-bold text-gray-900">{m.proteina}g</p><p className="text-xs text-gray-500">proteína / dia</p></div>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900">O que você tem em casa?</h2>
              <p className="mt-1 text-sm text-gray-500">
                Marque os alimentos disponíveis. A IA vai montar sua dieta usando eles.
              </p>

              {data.alimentosEmCasa.length > 0 && (
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-brand">
                    {data.alimentosEmCasa.length} {data.alimentosEmCasa.length === 1 ? 'item selecionado' : 'itens selecionados'}
                  </span>
                  <button type="button" onClick={() => setData(d => ({ ...d, alimentosEmCasa: [] }))}
                    className="text-xs text-gray-400 hover:text-gray-600 underline">
                    Limpar tudo
                  </button>
                </div>
              )}

              <div className="mt-4 space-y-4 max-h-[360px] overflow-y-auto pr-1">
                {ALIMENTOS_CATEGORIAS.map(cat => (
                  <div key={cat.label}>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      <span>{cat.emoji}</span> {cat.label}
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {cat.items.map(item => {
                        const selected = data.alimentosEmCasa.includes(item.id)
                        return (
                          <button key={item.id} type="button" onClick={() => toggleAlimento(item.id)}
                            className={cn(
                              'flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-all',
                              selected
                                ? 'border-brand bg-brand/5 font-medium text-brand'
                                : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50',
                            )}>
                            <span className={cn(
                              'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all',
                              selected ? 'border-brand bg-brand' : 'border-gray-300',
                            )}>
                              {selected && <Check className="h-2.5 w-2.5 text-white" />}
                            </span>
                            {item.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          {step > 1 ? (
            <button type="button" onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors">
              <ChevronLeft className="h-4 w-4" /> Anterior
            </button>
          ) : <div />}

          {step < TOTAL_STEPS ? (
            <button type="button" onClick={() => setStep(s => s + 1)} disabled={!canAdvance()}
              className="flex items-center gap-1.5 rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-600 disabled:opacity-40 disabled:pointer-events-none">
              Próximo <ChevronRight className="h-4 w-4" />
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
            Pode pular se preferir — a IA vai sugerir alimentos práticos e acessíveis.
          </p>
        )}
      </div>
    </div>
  )
}
