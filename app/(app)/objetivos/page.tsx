'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Activity, Flame, Scale, Target, TrendingDown, TrendingUp, Minus, Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { getGoals, saveGoals, type Goals, type ActivityLevel, type GoalType, type Sex } from '@/lib/store'

// ─── Harris-Benedict ──────────────────────────────────────────────────────────

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentario: 1.2,
  leve:       1.375,
  moderado:   1.55,
  intenso:    1.725,
  atleta:     1.9,
}

function calcTMB(peso: number, altura: number, idade: number, sexo: Sex): number {
  if (!peso || !altura || !idade) return 0
  if (sexo === 'masculino') {
    return Math.round(88.362 + 13.397 * peso + 4.799 * altura - 5.677 * idade)
  }
  return Math.round(447.593 + 9.247 * peso + 3.098 * altura - 4.330 * idade)
}

function calcTDEE(tmb: number, atividade: ActivityLevel): number {
  return Math.round(tmb * ACTIVITY_FACTORS[atividade])
}

function calcGoalKcal(tdee: number, objetivo: GoalType): number {
  if (objetivo === 'emagrecer')    return Math.max(1200, tdee - 500)
  if (objetivo === 'ganhar_massa') return tdee + 300
  return tdee
}

function calcMacros(kcal: number, objetivo: GoalType): { proteina: number; carbs: number; gordura: number } {
  let pProt: number, pCarb: number, pFat: number
  if (objetivo === 'emagrecer') {
    pProt = 0.35; pCarb = 0.40; pFat = 0.25
  } else if (objetivo === 'ganhar_massa') {
    pProt = 0.30; pCarb = 0.50; pFat = 0.20
  } else {
    pProt = 0.30; pCarb = 0.45; pFat = 0.25
  }
  return {
    proteina: Math.round((kcal * pProt) / 4),
    carbs:    Math.round((kcal * pCarb) / 4),
    gordura:  Math.round((kcal * pFat)  / 9),
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const ACTIVITY_OPTS: { value: ActivityLevel; label: string; desc: string }[] = [
  { value: 'sedentario', label: 'Sedentário',  desc: 'Pouco ou nenhum exercício' },
  { value: 'leve',       label: 'Leve',        desc: '1-3 dias/semana' },
  { value: 'moderado',   label: 'Moderado',    desc: '3-5 dias/semana' },
  { value: 'intenso',    label: 'Intenso',     desc: '6-7 dias/semana' },
  { value: 'atleta',     label: 'Atleta',      desc: '2x por dia' },
]

const GOAL_OPTS: { value: GoalType; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  {
    value: 'emagrecer',
    label: 'Perder peso',
    desc: 'Déficit calórico de 500 kcal/dia',
    icon: <TrendingDown className="h-5 w-5" />,
    color: 'border-blue-400 bg-blue-50 text-blue-700',
  },
  {
    value: 'manter',
    label: 'Manter peso',
    desc: 'Ingestão igual ao gasto total',
    icon: <Minus className="h-5 w-5" />,
    color: 'border-brand bg-brand/5 text-brand',
  },
  {
    value: 'ganhar_massa',
    label: 'Ganhar massa',
    desc: 'Superávit de 300 kcal/dia',
    icon: <TrendingUp className="h-5 w-5" />,
    color: 'border-purple-400 bg-purple-50 text-purple-700',
  },
]

interface MacroBarProps {
  label: string
  value: number
  max: number
  color: string
  unit?: string
}

function MacroBar({ label, value, max, color, unit = 'g' }: MacroBarProps) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-semibold text-gray-700">{label}</span>
        <span className="font-bold text-gray-900">{value}{unit}</span>
      </div>
      <div className="h-2.5 rounded-full bg-gray-100">
        <div
          className={cn('h-2.5 rounded-full transition-all duration-500', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

interface SliderFieldProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (v: number) => void
}

function SliderField({ label, value, min, max, step = 1, unit = '', onChange }: SliderFieldProps) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-700">{label}</label>
        <span className="text-sm font-bold text-brand">{value.toLocaleString('pt-BR')}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full cursor-pointer accent-brand"
      />
      <div className="flex justify-between">
        <span className="text-[11px] text-gray-400">{min}{unit}</span>
        <span className="text-[11px] text-gray-400">{max}{unit}</span>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ObjetivosPage() {
  const [goals, setGoals] = useState<Goals>(getGoals)
  const [customized, setCustomized] = useState(false)

  const tmb  = calcTMB(goals.peso, goals.altura, goals.idade, goals.sexo)
  const tdee = calcTDEE(tmb, goals.atividade)
  const recommended = calcGoalKcal(tdee, goals.objetivo)

  // Auto-update goals when physical data changes (unless user customized manually)
  useEffect(() => {
    if (!customized && recommended > 0) {
      const macros = calcMacros(recommended, goals.objetivo)
      setGoals(g => ({
        ...g,
        calorias_meta: recommended,
        proteina_meta: macros.proteina,
        carbs_meta:    macros.carbs,
        gordura_meta:  macros.gordura,
      }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goals.peso, goals.altura, goals.idade, goals.sexo, goals.atividade, goals.objetivo])

  function setField<K extends keyof Goals>(k: K, v: Goals[K]) {
    setGoals(g => ({ ...g, [k]: v }))
  }

  function handleManualChange<K extends keyof Goals>(k: K, v: Goals[K]) {
    setCustomized(true)
    setField(k, v)
  }

  function resetToRecommended() {
    const macros = calcMacros(recommended, goals.objetivo)
    setGoals(g => ({
      ...g,
      calorias_meta: recommended,
      proteina_meta: macros.proteina,
      carbs_meta:    macros.carbs,
      gordura_meta:  macros.gordura,
    }))
    setCustomized(false)
  }

  function handleSave() {
    saveGoals(goals)
    toast('Objetivos salvos com sucesso!', 'success')
  }

  const numInput = (label: string, key: keyof Goals, unit: string) => (
    <div>
      <label className="mb-1 block text-xs font-semibold text-gray-600">{label}</label>
      <div className="flex items-center rounded-xl border border-gray-200 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
        <input
          type="number"
          min={0}
          value={(goals[key] as number) || ''}
          onChange={e => setField(key, Number(e.target.value) as Goals[typeof key])}
          className="w-full rounded-l-xl bg-transparent px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none"
        />
        <span className="pr-3.5 text-xs text-gray-400">{unit}</span>
      </div>
    </div>
  )

  return (
    <div className="mx-auto max-w-3xl space-y-6">

      {/* Section: Personal data */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
            <Scale className="h-5 w-5 text-brand" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Dados pessoais</h2>
            <p className="text-xs text-gray-500">Usados para calcular seu metabolismo basal (TMB)</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {numInput('Peso atual', 'peso', 'kg')}
          {numInput('Peso meta', 'peso_meta', 'kg')}
          {numInput('Altura', 'altura', 'cm')}
          {numInput('Idade', 'idade', 'anos')}

          {/* Sexo */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Sexo</label>
            <div className="flex gap-2">
              {(['masculino', 'feminino'] as Sex[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setField('sexo', s)}
                  className={cn(
                    'flex-1 rounded-xl border py-2.5 text-xs font-semibold transition-all capitalize',
                    goals.sexo === s ? 'border-brand bg-brand text-white' : 'border-gray-200 text-gray-600 hover:border-brand',
                  )}
                >
                  {s === 'masculino' ? 'Masculino' : 'Feminino'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Activity level */}
        <div className="mt-5">
          <label className="mb-2 block text-sm font-semibold text-gray-700">Nível de atividade física</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
            {ACTIVITY_OPTS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setField('atividade', opt.value)}
                className={cn(
                  'rounded-xl border px-3 py-2.5 text-left transition-all',
                  goals.atividade === opt.value
                    ? 'border-brand bg-brand/5 ring-1 ring-brand'
                    : 'border-gray-200 hover:border-brand/40',
                )}
              >
                <p className={cn('text-xs font-bold', goals.atividade === opt.value ? 'text-brand' : 'text-gray-700')}>
                  {opt.label}
                </p>
                <p className="text-[10px] text-gray-400">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* TMB result */}
        {tmb > 0 && (
          <div className="mt-4 flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-2.5">
              <Flame className="h-4 w-4 text-orange-400" />
              <span className="text-xs text-gray-500">TMB:</span>
              <span className="font-bold text-gray-900">{tmb.toLocaleString('pt-BR')} kcal</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-2.5">
              <Activity className="h-4 w-4 text-brand" />
              <span className="text-xs text-gray-500">Gasto total:</span>
              <span className="font-bold text-gray-900">{tdee.toLocaleString('pt-BR')} kcal</span>
            </div>
          </div>
        )}
      </section>

      {/* Section: Objective */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
            <Target className="h-5 w-5 text-brand" />
          </div>
          <h2 className="font-bold text-gray-900">Objetivo</h2>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {GOAL_OPTS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setField('objetivo', opt.value)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-2xl border-2 p-5 text-center transition-all',
                goals.objetivo === opt.value
                  ? opt.color + ' ring-2 ring-offset-1'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300',
              )}
            >
              {opt.icon}
              <span className="font-bold text-sm">{opt.label}</span>
              <span className="text-[11px] opacity-70">{opt.desc}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Section: Daily targets */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
              <Flame className="h-5 w-5 text-brand" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Metas diárias</h2>
              {customized && (
                <p className="text-xs text-amber-600">Metas personalizadas</p>
              )}
            </div>
          </div>
          {customized && recommended > 0 && (
            <button
              onClick={resetToRecommended}
              className="text-xs font-semibold text-brand hover:underline"
            >
              Usar recomendado
            </button>
          )}
        </div>

        {recommended > 0 && !customized && (
          <div className="mb-4 rounded-xl bg-brand/5 border border-brand/20 px-4 py-3 text-sm text-brand">
            Recomendado para seu objetivo: <strong>{recommended.toLocaleString('pt-BR')} kcal/dia</strong>
          </div>
        )}

        <div className="space-y-5">
          <SliderField
            label="Calorias diárias"
            value={goals.calorias_meta}
            min={1000}
            max={5000}
            step={50}
            unit=" kcal"
            onChange={v => handleManualChange('calorias_meta', v)}
          />
          <SliderField
            label="Proteína"
            value={goals.proteina_meta}
            min={30}
            max={400}
            unit="g"
            onChange={v => handleManualChange('proteina_meta', v)}
          />
          <SliderField
            label="Carboidratos"
            value={goals.carbs_meta}
            min={30}
            max={600}
            unit="g"
            onChange={v => handleManualChange('carbs_meta', v)}
          />
          <SliderField
            label="Gordura"
            value={goals.gordura_meta}
            min={20}
            max={250}
            unit="g"
            onChange={v => handleManualChange('gordura_meta', v)}
          />
        </div>

        {/* Visual summary */}
        <div className="mt-6 space-y-3">
          <MacroBar label="Proteína"     value={goals.proteina_meta} max={400} color="bg-blue-500" />
          <MacroBar label="Carboidratos" value={goals.carbs_meta}    max={600} color="bg-amber-400" />
          <MacroBar label="Gordura"      value={goals.gordura_meta}  max={250} color="bg-rose-400" />
        </div>
      </section>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors shadow-sm"
        >
          <Save className="h-4 w-4" />
          Salvar objetivos
        </button>
      </div>
    </div>
  )
}
