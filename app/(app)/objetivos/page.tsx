'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity, AlertTriangle, BarChart2, CalendarCheck,
  Flame, RefreshCw, RotateCcw, Save, Scale, Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import {
  calcFromProfile, getProfile, saveProfile,
  PENDING_PLAN_KEY,
  type ActivityLevel, type DietaryPref, type GoalType, type Sex, type MacroTargets,
} from '@/lib/profile'
import { profileToAPIRestrictions } from '@/lib/profile'
import type { APIPlan } from '@/components/AIGeneratorDrawer'
import { toWeekPlan } from '@/components/AIGeneratorDrawer'

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTIVITY_OPTS: { value: ActivityLevel; icon: string; label: string; desc: string }[] = [
  { value: 'sedentario', icon: '🛋️', label: 'Sedentário',           desc: 'Pouco ou nenhum exercício' },
  { value: 'leve',       icon: '🚶', label: 'Levemente ativo',      desc: '1–3x por semana'            },
  { value: 'moderado',   icon: '🏃', label: 'Moderadamente ativo',  desc: '3–5x por semana'            },
  { value: 'intenso',    icon: '💪', label: 'Muito ativo',          desc: '6–7x por semana'            },
  { value: 'atleta',     icon: '🏋️', label: 'Atleta',               desc: 'Treino 2x/dia'              },
]

const GOAL_OPTS: { value: GoalType; icon: string; label: string; impact: string }[] = [
  { value: 'emagrecer',    icon: '🔥', label: 'Perder peso',  impact: 'Déficit de ~500 kcal/dia'  },
  { value: 'manter',       icon: '⚖️', label: 'Manter peso',  impact: 'Manutenção calórica'        },
  { value: 'ganhar_massa', icon: '💪', label: 'Ganhar massa',  impact: 'Superávit de ~300 kcal/dia' },
]

const DIETARY_OPTS: { value: DietaryPref; icon: string; label: string }[] = [
  { value: 'vegetariano', icon: '🌿', label: 'Vegetariano'       },
  { value: 'vegano',      icon: '🌱', label: 'Vegano'            },
  { value: 'sem_gluten',  icon: '🌾', label: 'Sem glúten'        },
  { value: 'sem_lactose', icon: '🥛', label: 'Sem lactose'       },
  { value: 'low_carb',    icon: '🥩', label: 'Low carb'          },
  { value: 'cetogenico',  icon: '⚡', label: 'Cetogênico (Keto)'  },
]

function getMondayOf(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return d
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function Section({ icon, title, subtitle, children }: {
  icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10">{icon}</div>
        <div>
          <h2 className="font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function MacroCard({
  icon, label, value, unit, onChange, color,
}: {
  icon: string; label: string; value: number; unit: string; onChange: (v: number) => void; color: string
}) {
  const [editing, setEditing] = useState(false)
  const [raw,     setRaw]     = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    setRaw(String(value))
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 50)
  }

  function commit() {
    const n = parseInt(raw, 10)
    if (!isNaN(n) && n > 0) onChange(n)
    setEditing(false)
  }

  return (
    <div className={cn('rounded-2xl border-2 p-4 text-center cursor-pointer transition-all hover:shadow-sm', color)}
      onClick={startEdit}
    >
      <div className="mb-1 text-2xl leading-none">{icon}</div>
      <p className="text-xs font-semibold text-gray-500 mb-2">{label}</p>
      {editing ? (
        <div className="flex items-center justify-center gap-1">
          <input
            ref={inputRef}
            type="number"
            value={raw}
            onChange={e => setRaw(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
            className="w-20 rounded-lg border border-brand bg-white px-2 py-1 text-center text-lg font-bold text-brand focus:outline-none"
          />
          <span className="text-xs text-gray-400">{unit}</span>
        </div>
      ) : (
        <p className="text-2xl font-extrabold text-gray-900">{value}<span className="ml-1 text-xs font-normal text-gray-400">{unit}</span></p>
      )}
    </div>
  )
}

function ProgressBar({ label, current, goal, color }: { label: string; current: number; goal: number; color: string }) {
  const pct = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold text-gray-900">{current} / {goal}</span>
      </div>
      <div className="h-2.5 rounded-full bg-gray-100">
        <div className={cn('h-2.5 rounded-full transition-all duration-500', color)} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-0.5 text-right text-xs text-gray-400">{pct}% da meta</p>
    </div>
  )
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 shrink-0 text-amber-500" />
          <p className="text-sm text-gray-800">{message}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={onConfirm} className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ObjetivosPage() {
  const router = useRouter()

  const [profile, setProfile] = useState(() => getProfile())
  const [metas,   setMetas]   = useState<MacroTargets>(() => getProfile().metas)
  const [customized,     setCustomized]     = useState(false)
  const [confirmRemontar, setConfirmRemontar] = useState(false)
  const [remontando,      setRemontando]      = useState(false)

  // Re-read profile on mount (SSR safe)
  useEffect(() => {
    const p = getProfile()
    setProfile(p)
    setMetas(p.metas)
  }, [])

  const calc = calcFromProfile(profile)

  // Auto-recalculate when fields change (unless user edited manually)
  useEffect(() => {
    if (!customized) {
      const c = calcFromProfile(profile)
      setMetas({
        kcal_dia:   c.macros.kcal_dia,
        proteina_g: c.macros.proteina_g,
        carbs_g:    c.macros.carbs_g,
        gordura_g:  c.macros.gordura_g,
        editado_manualmente: false,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.sexo, profile.idade, profile.altura_cm, profile.peso_atual_kg, profile.nivel_atividade, profile.objetivo, profile.preferencias])

  function set<K extends keyof typeof profile>(k: K, v: typeof profile[K]) {
    setProfile(p => ({ ...p, [k]: v }))
  }

  function setMetaManual<K extends keyof MacroTargets>(k: K, v: MacroTargets[K]) {
    setCustomized(true)
    setMetas(m => ({ ...m, [k]: v, editado_manualmente: true }))
  }

  function restoreCalculated() {
    const c = calcFromProfile(profile)
    setMetas({ kcal_dia: c.macros.kcal_dia, proteina_g: c.macros.proteina_g, carbs_g: c.macros.carbs_g, gordura_g: c.macros.gordura_g, editado_manualmente: false })
    setCustomized(false)
  }

  function handleSave() {
    saveProfile({ ...profile, metas: { ...metas, editado_manualmente: customized } })
    toast('Objetivos salvos!', 'success')
  }

  async function handleRemontar() {
    setConfirmRemontar(false)
    setRemontando(true)

    const updated = saveProfile({ ...profile, metas: { ...metas, editado_manualmente: customized } })
    toast('Gerando nova dieta...', 'info')

    try {
      const restricoes = profileToAPIRestrictions(updated)
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objetivo: updated.objetivo, calorias_meta: updated.metas.kcal_dia, proteina_meta: updated.metas.proteina_g, restricoes }),
      })
      if (res.ok) {
        const json = (await res.json()) as { plan?: APIPlan }
        if (json.plan) {
          const weekPlan = toWeekPlan(json.plan, getMondayOf(new Date()))
          localStorage.setItem(PENDING_PLAN_KEY, JSON.stringify(weekPlan))
          toast('Dieta gerada! Redirecionando...', 'success')
          await new Promise(r => setTimeout(r, 1200))
          router.push('/dashboard')
        }
      }
    } catch {
      toast('Erro ao gerar dieta. Tente novamente.', 'error')
    } finally {
      setRemontando(false)
    }
  }

  const peso  = profile.peso_atual_kg
  const desej = profile.peso_desejado_kg
  const diff  = peso && desej ? desej - peso : null

  const numInput = (label: string, key: keyof typeof profile, unit: string) => (
    <div>
      <label className="mb-1 block text-xs font-semibold text-gray-600">{label}</label>
      <div className="flex items-center rounded-xl border border-gray-200 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
        <input
          type="number"
          min={0}
          value={(profile[key] as number) || ''}
          onChange={e => set(key, Number(e.target.value) as typeof profile[typeof key])}
          className="w-full rounded-l-xl bg-transparent px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none"
        />
        <span className="pr-3.5 text-xs text-gray-400">{unit}</span>
      </div>
    </div>
  )

  return (
    <>
      {confirmRemontar && (
        <ConfirmDialog
          message="Isso vai substituir seu planejamento semanal atual. Deseja continuar?"
          onConfirm={handleRemontar}
          onCancel={() => setConfirmRemontar(false)}
        />
      )}

      <div className="mx-auto max-w-3xl space-y-5">

        {/* ─── 1. Dados pessoais ─────────────────────────────────── */}
        <Section icon={<Scale className="h-5 w-5 text-brand" />} title="Dados pessoais" subtitle="Usados para calcular seu metabolismo basal (TMB)">
          <div className="mb-4">
            <label className="mb-2 block text-sm font-semibold text-gray-700">Sexo biológico</label>
            <div className="grid grid-cols-2 gap-2 sm:w-72">
              {(['masculino', 'feminino'] as Sex[]).map(s => (
                <button key={s} type="button" onClick={() => set('sexo', s)}
                  className={cn('rounded-xl border py-2.5 text-sm font-semibold transition-all capitalize', profile.sexo === s ? 'border-brand bg-brand text-white' : 'border-gray-200 text-gray-600 hover:border-brand')}
                >
                  {s === 'masculino' ? '👨 Masculino' : '👩 Feminino'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {numInput('Peso atual',    'peso_atual_kg',    'kg')}
            {numInput('Peso desejado', 'peso_desejado_kg', 'kg')}
            {numInput('Altura',        'altura_cm',        'cm')}
            {numInput('Idade',         'idade',            'anos')}
          </div>

          {diff !== null && (
            <div className={cn('mt-4 rounded-xl px-4 py-2.5 text-sm font-semibold',
              diff < -0.1 ? 'bg-orange-50 text-orange-700' : diff > 0.1 ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700',
            )}>
              {diff < -0.1 ? `Meta: perder ${Math.abs(diff).toFixed(1)}kg` : diff > 0.1 ? `Meta: ganhar ${diff.toFixed(1)}kg` : 'Meta: manter peso atual'}
            </div>
          )}

          {calc.tmb > 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-2.5">
                <Flame className="h-4 w-4 text-orange-400" />
                <span className="text-xs text-gray-500">TMB:</span>
                <span className="font-bold text-gray-900">{calc.tmb.toLocaleString('pt-BR')} kcal</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-2.5">
                <Activity className="h-4 w-4 text-brand" />
                <span className="text-xs text-gray-500">TDEE:</span>
                <span className="font-bold text-gray-900">{calc.tdee.toLocaleString('pt-BR')} kcal</span>
              </div>
            </div>
          )}
        </Section>

        {/* ─── 2. Nível de atividade ─────────────────────────────── */}
        <Section icon={<Activity className="h-5 w-5 text-brand" />} title="Nível de atividade física">
          <div className="space-y-2">
            {ACTIVITY_OPTS.map(opt => {
              const sel = profile.nivel_atividade === opt.value
              return (
                <button key={opt.value} type="button" onClick={() => set('nivel_atividade', opt.value)}
                  className={cn('flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all', sel ? 'border-brand bg-brand/5 ring-1 ring-brand' : 'border-gray-200 hover:border-brand/30')}
                >
                  <span className="text-xl leading-none shrink-0">{opt.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-bold', sel ? 'text-brand' : 'text-gray-800')}>{opt.label}</p>
                    <p className="text-xs text-gray-400">{opt.desc}</p>
                  </div>
                  {sel && (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand">
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </Section>

        {/* ─── 3. Objetivo ───────────────────────────────────────── */}
        <Section icon={<Target className="h-5 w-5 text-brand" />} title="Objetivo">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {GOAL_OPTS.map(opt => {
              const sel = profile.objetivo === opt.value
              return (
                <button key={opt.value} type="button" onClick={() => set('objetivo', opt.value)}
                  className={cn('flex flex-col items-center gap-2 rounded-2xl border-2 p-5 text-center transition-all', sel ? 'border-brand bg-brand/5 ring-1 ring-brand' : 'border-gray-200 hover:border-gray-300')}
                >
                  <span className="text-3xl leading-none">{opt.icon}</span>
                  <span className={cn('font-bold text-sm', sel ? 'text-brand' : 'text-gray-800')}>{opt.label}</span>
                  <span className="text-[11px] text-gray-400">{opt.impact}</span>
                </button>
              )
            })}
          </div>
        </Section>

        {/* ─── 4. Metas calculadas ───────────────────────────────── */}
        <Section icon={<Flame className="h-5 w-5 text-brand" />} title="Metas diárias" subtitle="Clique em qualquer valor para editar manualmente">
          {calc.tmb > 0 && (
            <div className="mb-4 rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-500">
              TMB {calc.tmb.toLocaleString('pt-BR')} × {({ sedentario: '1.2', leve: '1.375', moderado: '1.55', intenso: '1.725', atleta: '1.9' })[profile.nivel_atividade]} = {calc.tdee.toLocaleString('pt-BR')} kcal
              {profile.objetivo === 'emagrecer' && ' − 500 = ' + calc.kcal_meta.toLocaleString('pt-BR') + ' kcal/dia'}
              {profile.objetivo === 'ganhar_massa' && ' + 300 = ' + calc.kcal_meta.toLocaleString('pt-BR') + ' kcal/dia'}
              {profile.objetivo === 'manter' && ' = ' + calc.kcal_meta.toLocaleString('pt-BR') + ' kcal/dia de manutenção'}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MacroCard icon="🔥" label="Calorias"    value={metas.kcal_dia}   unit="kcal" color="border-orange-200 bg-orange-50" onChange={v => setMetaManual('kcal_dia', v)} />
            <MacroCard icon="🥩" label="Proteína"    value={metas.proteina_g} unit="g/dia" color="border-blue-200  bg-blue-50"   onChange={v => setMetaManual('proteina_g', v)} />
            <MacroCard icon="🍚" label="Carboidratos" value={metas.carbs_g}   unit="g/dia" color="border-amber-200 bg-amber-50"  onChange={v => setMetaManual('carbs_g', v)} />
            <MacroCard icon="🥑" label="Gordura"     value={metas.gordura_g}  unit="g/dia" color="border-rose-200  bg-rose-50"   onChange={v => setMetaManual('gordura_g', v)} />
          </div>

          {customized && (
            <button onClick={restoreCalculated} className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline">
              <RotateCcw className="h-3.5 w-3.5" /> Restaurar valores calculados
            </button>
          )}

          <p className="mt-2 text-xs text-gray-400">Calculado com base no seu perfil. Clique nos cards para ajustar manualmente.</p>
        </Section>

        {/* ─── 5. Preferências ───────────────────────────────────── */}
        <Section icon={<Target className="h-5 w-5 text-brand" />} title="Preferências alimentares" subtitle="Aplicadas automaticamente no Gerador IA">
          <div className="grid grid-cols-2 gap-2 mb-4 sm:grid-cols-3">
            {DIETARY_OPTS.map(opt => {
              const active = profile.preferencias.includes(opt.value)
              return (
                <button key={opt.value} type="button"
                  onClick={() => set('preferencias', active ? profile.preferencias.filter(p => p !== opt.value) : [...profile.preferencias, opt.value])}
                  className={cn('flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left transition-all', active ? 'border-brand bg-brand/5 ring-1 ring-brand' : 'border-gray-200 hover:border-brand/30')}
                >
                  <span className="text-xl leading-none">{opt.icon}</span>
                  <span className={cn('text-sm font-semibold', active ? 'text-brand' : 'text-gray-700')}>{opt.label}</span>
                </button>
              )
            })}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Alimentos que não gosto (separados por vírgula)</label>
            <textarea
              value={profile.alimentos_nao_gosta}
              onChange={e => set('alimentos_nao_gosta', e.target.value)}
              placeholder="Ex: fígado, chuchu, jiló..."
              rows={2}
              className="w-full resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </Section>

        {/* ─── 6. Progresso da semana ────────────────────────────── */}
        <Section icon={<BarChart2 className="h-5 w-5 text-brand" />} title="Progresso da semana" subtitle="Comparando suas metas vs. refeições planejadas">
          <div className="space-y-4">
            <ProgressBar label="Calorias (média/dia)" current={1317} goal={metas.kcal_dia}   color="bg-orange-400" />
            <ProgressBar label="Proteína (média/dia)"  current={94}   goal={metas.proteina_g} color="bg-blue-500"   />
            <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CalendarCheck className="h-4 w-4 text-brand" />
                <span>Dias planejados</span>
              </div>
              <span className="font-bold text-gray-900">5 / 7</span>
            </div>
          </div>
          <a href="/macros" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
            Ver análise completa →
          </a>
          <p className="mt-1 text-[11px] text-gray-400">* Valores baseados no planejamento atual da semana.</p>
        </Section>

        {/* ─── Rodapé ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <button
            onClick={() => {
              if (confirm('Refazer o onboarding vai redefinir seu progresso. Continuar?')) {
                saveProfile({ onboarding_done: false })
                window.location.reload()
              }
            }}
            className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors sm:self-end"
          >
            Refazer onboarding
          </button>

          <div className="flex gap-3">
            <button
              onClick={() => setConfirmRemontar(true)}
              disabled={remontando}
              className="flex items-center gap-2 rounded-xl border border-brand px-5 py-3 text-sm font-semibold text-brand hover:bg-brand/5 disabled:opacity-60 transition-colors"
            >
              {remontando ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Remontar minha dieta
            </button>

            <button
              onClick={handleSave}
              className="flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors shadow-sm"
            >
              <Save className="h-4 w-4" /> Salvar alterações
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
