'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  calcFromProfile, profileToAPIRestrictions, saveProfile,
  ONBOARDING_STEP_KEY, PENDING_PLAN_KEY, WIZARD_DATA_KEY,
  type ActivityLevel, type DietaryPref, type GoalType, type Sex,
} from '@/lib/profile'
import { toWeekPlan, type APIPlan } from './AIGeneratorDrawer'

// ─── Internal form state ──────────────────────────────────────────────────────

interface WizardData {
  nome:              string
  sexo:              Sex
  idade:             string
  altura_cm:         string
  peso_atual_kg:     string
  peso_desejado_kg:  string
  nivel_atividade:   ActivityLevel | ''
  objetivo:          GoalType | ''
  preferencias:      DietaryPref[]
  alimentos_nao_gosta: string
}

const EMPTY: WizardData = {
  nome: '', sexo: 'masculino', idade: '', altura_cm: '',
  peso_atual_kg: '', peso_desejado_kg: '',
  nivel_atividade: '', objetivo: '',
  preferencias: [], alimentos_nao_gosta: '',
}

function loadSaved(): { data: WizardData; step: number } {
  try {
    const stepRaw = localStorage.getItem(ONBOARDING_STEP_KEY)
    const dataRaw = localStorage.getItem(WIZARD_DATA_KEY)
    const step = stepRaw ? Math.min(4, Math.max(0, parseInt(stepRaw, 10))) : 0
    const data: WizardData = dataRaw ? { ...EMPTY, ...JSON.parse(dataRaw) } : { ...EMPTY }
    return { data, step: isNaN(step) ? 0 : step }
  } catch {
    return { data: { ...EMPTY }, step: 0 }
  }
}

function getMondayOf(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return d
}

// ─── Options ──────────────────────────────────────────────────────────────────

const ACTIVITY_OPTS: { value: ActivityLevel; icon: string; label: string; desc: string }[] = [
  { value: 'sedentario', icon: '🛋️', label: 'Sedentário',           desc: 'Pouco ou nenhum exercício, trabalho sentado'          },
  { value: 'leve',       icon: '🚶', label: 'Levemente ativo',      desc: 'Exercício leve 1–3x por semana'                      },
  { value: 'moderado',   icon: '🏃', label: 'Moderadamente ativo',  desc: 'Exercício moderado 3–5x por semana'                  },
  { value: 'intenso',    icon: '💪', label: 'Muito ativo',          desc: 'Exercício intenso 6–7x por semana'                  },
  { value: 'atleta',     icon: '🏋️', label: 'Atleta',               desc: 'Treino pesado 2x por dia ou trabalho físico intenso' },
]

const GOAL_OPTS: { value: GoalType; icon: string; label: string; desc: string; impact: string }[] = [
  { value: 'emagrecer',    icon: '🔥', label: 'Perder peso',  desc: 'Déficit calórico controlado para emagrecer com saúde', impact: 'Déficit de ~500 kcal/dia'  },
  { value: 'manter',       icon: '⚖️', label: 'Manter peso',  desc: 'Equilíbrio calórico para manter sua composição atual', impact: 'Manutenção calórica'        },
  { value: 'ganhar_massa', icon: '💪', label: 'Ganhar massa',  desc: 'Superávit calórico para construir músculo',           impact: 'Superávit de ~300 kcal/dia' },
]

const DIETARY_OPTS: { value: DietaryPref; icon: string; label: string }[] = [
  { value: 'vegetariano', icon: '🌿', label: 'Vegetariano'       },
  { value: 'vegano',      icon: '🌱', label: 'Vegano'            },
  { value: 'sem_gluten',  icon: '🌾', label: 'Sem glúten'        },
  { value: 'sem_lactose', icon: '🥛', label: 'Sem lactose'       },
  { value: 'low_carb',    icon: '🥩', label: 'Low carb'          },
  { value: 'cetogenico',  icon: '⚡', label: 'Cetogênico (Keto)'  },
]

const LOADING_MSGS = [
  'Calculando suas necessidades calóricas...',
  'Definindo distribuição de macros...',
  'Selecionando receitas personalizadas...',
  'Montando seu planejamento semanal...',
  'Quase lá! Finalizando sua dieta...',
]

// ─── UI helpers ───────────────────────────────────────────────────────────────

function Logo() {
  return (
    <div className="mb-7 flex justify-center">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-white">
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
          </svg>
        </div>
        <span className="text-base font-bold tracking-tight text-[#E6EDF3]">NutriWeek</span>
      </div>
    </div>
  )
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="mb-7">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-[#8B949E]">Passo {current} de {total}</span>
        <span className="text-xs text-[#8B949E]">{Math.round((current / total) * 100)}%</span>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className={cn('h-1.5 flex-1 rounded-full transition-all duration-500', i < current ? 'bg-brand' : 'bg-[#2D333B]')} />
        ))}
      </div>
    </div>
  )
}

function Err({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1.5 text-xs font-medium text-red-600">{msg}</p> : null
}

function CheckIcon() {
  return (
    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand">
      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  )
}

// ─── Step 1 — Welcome ─────────────────────────────────────────────────────────

function Step1({
  data, setField, errors, onNext,
}: {
  data: WizardData
  setField: (k: keyof WizardData, v: string) => void
  errors: Record<string, string>
  onNext: () => void
}) {
  return (
    <div>
      <div className="mb-8 text-center">
        <div className="mb-4 text-6xl leading-none">🥗</div>
        <h1 className="text-[1.6rem] font-extrabold text-[#E6EDF3]">Bem-vindo ao NutriWeek!</h1>
        <p className="mt-2 text-sm text-[#8B949E]">
          Vamos montar sua dieta personalizada em menos de 2 minutos.
        </p>
      </div>
      <label className="mb-1.5 block text-sm font-semibold text-[#E6EDF3]">Como posso te chamar?</label>
      <input
        value={data.nome}
        onChange={e => setField('nome', e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onNext() }}
        placeholder="Seu primeiro nome"
        autoFocus
        className={cn(
          'w-full rounded-xl border px-4 py-3 text-base text-[#E6EDF3] placeholder:text-[#8B949E] focus:outline-none focus:ring-2 focus:ring-brand/20',
          errors.nome ? 'border-red-300' : 'border-[#2D333B] focus:border-brand',
        )}
      />
      <Err msg={errors.nome} />
    </div>
  )
}

// ─── Step 2 — Physical data ───────────────────────────────────────────────────

function Step2({
  data, setField, errors,
}: {
  data: WizardData
  setField: (k: keyof WizardData, v: string | Sex) => void
  errors: Record<string, string>
}) {
  const peso  = parseFloat(data.peso_atual_kg)
  const desej = parseFloat(data.peso_desejado_kg)
  const diff  = !isNaN(peso) && !isNaN(desej) && data.peso_atual_kg && data.peso_desejado_kg ? desej - peso : null

  const numField = (key: keyof WizardData, label: string, unit: string, placeholder: string, min: number, max: number) => (
    <div>
      <label className="mb-1 block text-xs font-semibold text-[#8B949E]">{label}</label>
      <div className={cn('flex items-center rounded-xl border focus-within:ring-2 focus-within:ring-brand/20', errors[key] ? 'border-red-300' : 'border-[#2D333B] focus-within:border-brand')}>
        <input
          type="number"
          value={data[key] as string}
          onChange={e => setField(key, e.target.value)}
          placeholder={placeholder}
          min={min}
          max={max}
          className="w-full rounded-l-xl bg-transparent px-3 py-2.5 text-sm text-[#E6EDF3] placeholder:text-[#8B949E] focus:outline-none"
        />
        <span className="pr-3 text-xs text-[#8B949E] shrink-0">{unit}</span>
      </div>
      <Err msg={errors[key]} />
    </div>
  )

  return (
    <div>
      <h2 className="text-xl font-extrabold text-[#E6EDF3]">Me conta sobre você</h2>
      <p className="mt-1 mb-5 text-sm text-[#8B949E]">Esses dados calculam suas necessidades calóricas reais.</p>

      <div className="mb-4">
        <label className="mb-2 block text-sm font-semibold text-[#E6EDF3]">Sexo biológico</label>
        <div className="grid grid-cols-2 gap-2">
          {(['masculino', 'feminino'] as Sex[]).map(s => (
            <button key={s} type="button" onClick={() => setField('sexo', s)}
              className={cn('rounded-xl border py-2.5 text-sm font-semibold transition-all', data.sexo === s ? 'border-brand bg-brand text-white' : 'border-[#2D333B] text-[#8B949E] hover:border-brand/50')}
            >
              {s === 'masculino' ? '👨 Masculino' : '👩 Feminino'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        {numField('idade',     'Idade',  'anos', '28',  10,  100)}
        {numField('altura_cm', 'Altura', 'cm',   '175', 100, 250)}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {numField('peso_atual_kg',    'Peso atual',    'kg', '80', 30, 300)}
        {numField('peso_desejado_kg', 'Peso desejado', 'kg', '75', 30, 300)}
      </div>

      {diff !== null && (
        <div className={cn('mt-4 rounded-xl px-4 py-2.5 text-center text-sm font-semibold',
          diff < -0.1 ? 'bg-orange-500/10 text-orange-400' : diff > 0.1 ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400',
        )}>
          {diff < -0.1 ? `Você quer perder ${Math.abs(diff).toFixed(1)}kg` : diff > 0.1 ? `Você quer ganhar ${diff.toFixed(1)}kg` : 'Você quer manter seu peso atual'}
        </div>
      )}
    </div>
  )
}

// ─── Step 3 — Activity ────────────────────────────────────────────────────────

function Step3({
  data, setField, errors,
}: {
  data: WizardData
  setField: (k: 'nivel_atividade', v: ActivityLevel) => void
  errors: Record<string, string>
}) {
  return (
    <div>
      <h2 className="text-xl font-extrabold text-[#E6EDF3]">Qual é seu nível de atividade?</h2>
      <p className="mt-1 mb-5 text-sm text-[#8B949E]">Seja honesto — isso impacta diretamente sua meta calórica.</p>
      <div className="space-y-2">
        {ACTIVITY_OPTS.map(opt => {
          const sel = data.nivel_atividade === opt.value
          return (
            <button key={opt.value} type="button" onClick={() => setField('nivel_atividade', opt.value)}
              className={cn('flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all', sel ? 'border-brand bg-brand/5 ring-1 ring-brand' : 'border-[#2D333B] hover:border-brand/30 hover:bg-[#21262d]')}
            >
              <span className="text-xl leading-none shrink-0">{opt.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-bold', sel ? 'text-brand' : 'text-[#E6EDF3]')}>{opt.label}</p>
                <p className="text-xs text-[#8B949E]">{opt.desc}</p>
              </div>
              {sel && <CheckIcon />}
            </button>
          )
        })}
      </div>
      <Err msg={errors.nivel_atividade} />
    </div>
  )
}

// ─── Step 4 — Goal ────────────────────────────────────────────────────────────

function Step4({
  data, setField, errors,
}: {
  data: WizardData
  setField: (k: 'objetivo', v: GoalType) => void
  errors: Record<string, string>
}) {
  function previewKcal(objetivo: GoalType): number | null {
    const peso = parseFloat(data.peso_atual_kg)
    const alt  = parseFloat(data.altura_cm)
    const age  = parseFloat(data.idade)
    if (!peso || !alt || !age || !data.nivel_atividade) return null
    return calcFromProfile({ sexo: data.sexo, idade: age, altura_cm: alt, peso_atual_kg: peso, nivel_atividade: data.nivel_atividade as ActivityLevel, objetivo, preferencias: data.preferencias }).kcal_meta
  }

  return (
    <div>
      <h2 className="text-xl font-extrabold text-[#E6EDF3]">Qual é seu objetivo?</h2>
      <p className="mt-1 mb-5 text-sm text-[#8B949E]">Isso define seu déficit ou superávit calórico diário.</p>
      <div className="space-y-3">
        {GOAL_OPTS.map(opt => {
          const sel  = data.objetivo === opt.value
          const kcal = sel ? previewKcal(opt.value) : null
          return (
            <button key={opt.value} type="button" onClick={() => setField('objetivo', opt.value)}
              className={cn('flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-all', sel ? 'border-brand bg-brand/5 ring-1 ring-brand' : 'border-[#2D333B] hover:border-brand/30 hover:bg-[#21262d]')}
            >
              <span className="text-3xl leading-none mt-0.5 shrink-0">{opt.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={cn('font-bold text-sm', sel ? 'text-brand' : 'text-[#E6EDF3]')}>{opt.label}</p>
                <p className="text-xs text-[#8B949E] mt-0.5">{opt.desc}</p>
                <p className="text-xs text-[#8B949E] mt-1">• {opt.impact}</p>
                {kcal !== null && <p className="mt-2 text-xs font-bold text-brand">Sua meta: ~{kcal.toLocaleString('pt-BR')} kcal/dia</p>}
              </div>
              {sel && <div className="mt-0.5 shrink-0"><CheckIcon /></div>}
            </button>
          )
        })}
      </div>
      <Err msg={errors.objetivo} />
    </div>
  )
}

// ─── Step 5 — Preferences ────────────────────────────────────────────────────

function Step5({
  data, setField, onSkip,
}: {
  data: WizardData
  setField: (k: keyof WizardData, v: DietaryPref[] | string) => void
  onSkip: () => void
}) {
  function toggle(pref: DietaryPref) {
    const next = data.preferencias.includes(pref) ? data.preferencias.filter(p => p !== pref) : [...data.preferencias, pref]
    setField('preferencias', next)
  }

  return (
    <div>
      <h2 className="text-xl font-extrabold text-[#E6EDF3]">Tem alguma restrição?</h2>
      <p className="mt-1 mb-5 text-sm text-[#8B949E]">Opcional — pode pular e ajustar depois nas configurações.</p>
      <div className="grid grid-cols-2 gap-2 mb-5">
        {DIETARY_OPTS.map(opt => {
          const active = data.preferencias.includes(opt.value)
          return (
            <button key={opt.value} type="button" onClick={() => toggle(opt.value)}
              className={cn('flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left transition-all', active ? 'border-brand bg-brand/5 ring-1 ring-brand' : 'border-[#2D333B] hover:border-brand/30')}
            >
              <span className="text-xl leading-none">{opt.icon}</span>
              <span className={cn('text-sm font-semibold', active ? 'text-brand' : 'text-[#E6EDF3]')}>{opt.label}</span>
            </button>
          )
        })}
      </div>
      <label className="mb-1.5 block text-sm font-semibold text-[#E6EDF3]">Alimentos que não gosto ou não posso comer</label>
      <textarea
        value={data.alimentos_nao_gosta}
        onChange={e => setField('alimentos_nao_gosta', e.target.value)}
        placeholder="Ex: fígado, chuchu, jiló..."
        rows={2}
        className="w-full resize-none rounded-xl border border-[#2D333B] px-3.5 py-2.5 text-sm placeholder:text-[#8B949E] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
      />
      <button type="button" onClick={onSkip} className="mt-4 w-full text-sm text-[#8B949E] hover:text-[#E6EDF3] transition-colors">
        Pular por agora →
      </button>
    </div>
  )
}

// ─── Loading screen ───────────────────────────────────────────────────────────

function LoadingScreen({ nome }: { nome: string }) {
  const [idx,  setIdx]  = useState(0)
  const [fade, setFade] = useState(true)

  useEffect(() => {
    const t = setInterval(() => {
      setFade(false)
      setTimeout(() => { setIdx(i => (i + 1) % LOADING_MSGS.length); setFade(true) }, 300)
    }, 1800)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0F1117] px-4">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-brand/20" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-brand shadow-lg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-white">
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
            </svg>
          </div>
        </div>

        {nome && <p className="text-base font-semibold text-[#E6EDF3]">Montando sua dieta, {nome}!</p>}

        <div className="min-h-[1.5rem] flex items-center">
          <p className={cn('text-sm text-[#8B949E] transition-all duration-300', fade ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1')}>
            {LOADING_MSGS[idx]}
          </p>
        </div>

        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

interface Props { onComplete: () => void }

export function OnboardingWizard({ onComplete }: Props) {
  const router = useRouter()
  const [step,      setStep]      = useState(0)
  const [data,      setData]      = useState<WizardData>({ ...EMPTY })
  const [errors,    setErrors]    = useState<Record<string, string>>({})
  const [visible,   setVisible]   = useState(true)
  const [dir,       setDir]       = useState<'fwd' | 'bck'>('fwd')
  const [isLoading, setIsLoading] = useState(false)

  // Restore saved progress
  useEffect(() => {
    const saved = loadSaved()
    setData(saved.data)
    setStep(saved.step)
  }, [])

  // Persist step + form data
  useEffect(() => {
    if (step < 5) {
      localStorage.setItem(ONBOARDING_STEP_KEY, String(step))
      localStorage.setItem(WIZARD_DATA_KEY, JSON.stringify(data))
    }
  }, [step, data])

  function setField(k: keyof WizardData, v: string | Sex | ActivityLevel | GoalType | DietaryPref[]) {
    setData(d => ({ ...d, [k]: v }))
    setErrors(e => { const n = { ...e }; delete n[k as string]; return n })
  }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {}
    if (step === 0) {
      if (!data.nome.trim() || data.nome.trim().length < 2)
        e.nome = 'Informe um nome com pelo menos 2 caracteres.'
    }
    if (step === 1) {
      const idade  = parseFloat(data.idade)
      const altura = parseFloat(data.altura_cm)
      const peso   = parseFloat(data.peso_atual_kg)
      const desej  = parseFloat(data.peso_desejado_kg)
      if (!data.idade  || isNaN(idade)  || idade  < 10  || idade  > 100) e.idade          = 'Idade entre 10 e 100 anos.'
      if (!data.altura_cm || isNaN(altura) || altura < 100 || altura > 250) e.altura_cm   = 'Altura entre 100 e 250 cm.'
      if (!data.peso_atual_kg || isNaN(peso) || peso < 30 || peso > 300) e.peso_atual_kg  = 'Peso entre 30 e 300 kg.'
      if (!data.peso_desejado_kg || isNaN(desej) || desej < 30 || desej > 300) e.peso_desejado_kg = 'Peso entre 30 e 300 kg.'
    }
    if (step === 2 && !data.nivel_atividade) e.nivel_atividade = 'Selecione seu nível de atividade.'
    if (step === 3 && !data.objetivo)        e.objetivo        = 'Selecione um objetivo.'
    return e
  }

  function slide(direction: 'fwd' | 'bck', cb: () => void) {
    setDir(direction)
    setVisible(false)
    setTimeout(() => { cb(); setVisible(true) }, 200)
  }

  function goNext() {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    slide('fwd', () => setStep(s => s + 1))
  }

  function goPrev() {
    slide('bck', () => setStep(s => s - 1))
  }

  async function finish(skip = false) {
    if (!skip) {
      const errs = validate()
      if (Object.keys(errs).length) { setErrors(errs); return }
    }

    setIsLoading(true)
    slide('fwd', () => setStep(5))

    const peso   = parseFloat(data.peso_atual_kg)
    const altura = parseFloat(data.altura_cm)
    const idade  = parseFloat(data.idade)
    const nivel  = (data.nivel_atividade || 'moderado') as ActivityLevel
    const obj    = (data.objetivo || 'manter') as GoalType

    const calc = calcFromProfile({ sexo: data.sexo, idade, altura_cm: altura, peso_atual_kg: peso, nivel_atividade: nivel, objetivo: obj, preferencias: data.preferencias })

    const profile = saveProfile({
      onboarding_done:     true,
      nome:                data.nome.trim(),
      sexo:                data.sexo,
      idade,
      altura_cm:           altura,
      peso_atual_kg:       peso,
      peso_desejado_kg:    parseFloat(data.peso_desejado_kg) || peso,
      nivel_atividade:     nivel,
      objetivo:            obj,
      preferencias:        data.preferencias,
      alimentos_nao_gosta: data.alimentos_nao_gosta,
      metas: {
        kcal_dia:           calc.macros.kcal_dia,
        proteina_g:         calc.macros.proteina_g,
        carbs_g:            calc.macros.carbs_g,
        gordura_g:          calc.macros.gordura_g,
        editado_manualmente: false,
      },
    })

    const t0 = Date.now()

    try {
      const restricoes = profileToAPIRestrictions(profile)
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objetivo: obj, calorias_meta: calc.macros.kcal_dia, proteina_meta: calc.macros.proteina_g, restricoes }),
      })
      if (res.ok) {
        const json = (await res.json()) as { plan?: APIPlan }
        if (json.plan) {
          const weekPlan = toWeekPlan(json.plan, getMondayOf(new Date()))
          localStorage.setItem(PENDING_PLAN_KEY, JSON.stringify(weekPlan))
        }
      }
    } catch { /* non-critical */ }

    // Ensure minimum 4.5s display for perceived value
    const elapsed = Date.now() - t0
    await new Promise(r => setTimeout(r, Math.max(0, 4500 - elapsed)))

    localStorage.removeItem(ONBOARDING_STEP_KEY)
    localStorage.removeItem(WIZARD_DATA_KEY)

    onComplete()
    router.push('/dashboard')
  }

  // Loading screen
  if (step === 5 || isLoading) {
    return <LoadingScreen nome={data.nome.trim()} />
  }

  const isFirst = step === 0
  const isLast  = step === 4
  const transX  = dir === 'fwd' ? '10px' : '-10px'

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0F1117] px-4 py-10">
      <div
        className="w-full max-w-[520px] rounded-3xl bg-[#1C2128] border border-[#2D333B] p-8 shadow-xl"
        style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateX(0)' : `translateX(${transX})`, transition: 'opacity 0.2s ease, transform 0.2s ease' }}
      >
        <Logo />
        <ProgressBar current={step + 1} total={5} />

        {step === 0 && <Step1 data={data} setField={setField} errors={errors} onNext={goNext} />}
        {step === 1 && <Step2 data={data} setField={setField} errors={errors} />}
        {step === 2 && <Step3 data={data} setField={(k, v) => setField(k, v as ActivityLevel)} errors={errors} />}
        {step === 3 && <Step4 data={data} setField={(k, v) => setField(k, v as GoalType)} errors={errors} />}
        {step === 4 && <Step5 data={data} setField={setField} onSkip={() => finish(true)} />}

        <div className={cn('mt-8 flex gap-3', isFirst ? 'justify-end' : 'justify-between')}>
          {!isFirst && (
            <button type="button" onClick={goPrev}
              className="flex items-center gap-2 rounded-xl border border-[#2D333B] px-5 py-2.5 text-sm font-semibold text-[#8B949E] hover:bg-[#21262d] transition-colors"
            >
              ← Voltar
            </button>
          )}
          <button
            type="button"
            onClick={isLast ? () => finish(false) : goNext}
            className="flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors shadow-sm"
          >
            {isFirst ? 'Vamos começar →' : isLast ? 'Finalizar e montar minha dieta →' : 'Continuar →'}
          </button>
        </div>
      </div>
    </div>
  )
}
