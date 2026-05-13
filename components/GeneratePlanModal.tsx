'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getProfile } from '@/lib/profile'
import { diasToWeekPlan } from '@/lib/pending-plans'
import type { WeekPlan } from '@/types'

// ─── Food categories ──────────────────────────────────────────────────────────

const ALIMENTOS_CATEGORIAS = [
  {
    label: 'Proteínas', emoji: '🥩',
    items: [
      'Frango', 'Carne moída', 'Ovos', 'Atum (lata)', 'Sardinha (lata)',
      'Peixe', 'Feijão', 'Lentilha', 'Grão-de-bico', 'Presunto/Peito peru',
    ],
  },
  {
    label: 'Carboidratos', emoji: '🍚',
    items: ['Arroz', 'Macarrão', 'Pão', 'Batata', 'Batata-doce', 'Aveia', 'Tapioca', 'Mandioca/Aipim', 'Granola'],
  },
  {
    label: 'Legumes e Verduras', emoji: '🥦',
    items: ['Alface', 'Tomate', 'Cenoura', 'Cebola', 'Alho', 'Brócolis', 'Abobrinha', 'Espinafre', 'Beterraba', 'Couve', 'Pepino'],
  },
  {
    label: 'Frutas', emoji: '🍎',
    items: ['Banana', 'Maçã', 'Laranja', 'Mamão', 'Abacate', 'Morango', 'Limão', 'Melancia', 'Manga'],
  },
  {
    label: 'Laticínios', emoji: '🥛',
    items: ['Leite', 'Queijo', 'Iogurte', 'Requeijão', 'Manteiga'],
  },
  {
    label: 'Gorduras e Temperos', emoji: '🫒',
    items: ['Azeite', 'Óleo de cozinha', 'Sal e temperos'],
  },
]

// ─── Progress messages ────────────────────────────────────────────────────────

const MESSAGES = [
  'Analisando seus ingredientes…',
  'Calculando suas metas calóricas…',
  'Selecionando combinações ideais…',
  'Montando o cardápio da semana…',
  'Equilibrando proteínas e carboidratos…',
  'Ajustando as porções…',
  'Revisando a dieta completa…',
  'Quase pronto…',
]

// Progress goes from 0 → 88% over DURATION_MS, then jumps to 100% when done
const DURATION_MS = 50_000

// ─── Types ────────────────────────────────────────────────────────────────────

interface DiaAPI {
  dia?: string
  cafe_da_manha?: { nome: string; calorias: number; proteina: number; carbs: number; gordura: number }
  lanche?:        { nome: string; calorias: number; proteina: number; carbs: number; gordura: number }
  almoco?:        { nome: string; calorias: number; proteina: number; carbs: number; gordura: number }
  jantar?:        { nome: string; calorias: number; proteina: number; carbs: number; gordura: number }
}

interface Props {
  isOpen:    boolean
  weekStart: string
  onClose:   () => void
  onSuccess: (plan: WeekPlan) => void
}

// ─── Main component ───────────────────────────────────────────────────────────

export function GeneratePlanModal({ isOpen, weekStart, onClose, onSuccess }: Props) {
  const profile = getProfile()
  const [selecionados, setSelecionados] = useState<string[]>(profile.alimentos_em_casa ?? [])
  const [generating,   setGenerating]   = useState(false)
  const [done,         setDone]         = useState(false)
  const [error,        setError]        = useState('')

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) { setGenerating(false); setDone(false); setError('') }
  }, [isOpen])

  function toggle(item: string) {
    setSelecionados(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item])
  }

  async function handleGenerate() {
    setGenerating(true)
    setError('')
    try {
      const userId   = `local-${Date.now()}`
      const objetivo = profile.objetivo         ?? 'manter'
      const kcal     = profile.metas.kcal_dia   || 2000
      const prot     = profile.metas.proteina_g || 150

      // Try n8n first, fallback to OpenAI
      const n8nRes = await fetch('/api/n8n/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objetivo, calorias_meta: kcal, proteina_meta: prot, alimentos_em_casa: selecionados, userId, weekStart }),
      })
      if (n8nRes.ok) {
        const j = await n8nRes.json() as { ok?: boolean; data?: unknown }
        if (j.ok && j.data) {
          const d = j.data as Record<string, unknown>
          const dias = (d.dias ?? (d.plan as Record<string, unknown>)?.dias) as DiaAPI[] | undefined
          if (dias?.length) {
            setDone(true)
            setTimeout(() => onSuccess(diasToWeekPlan(userId, weekStart, dias)), 700)
            return
          }
        }
      }

      // OpenAI fallback
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objetivo, calorias_meta: kcal, proteina_meta: prot, alimentos_em_casa: selecionados }),
      })
      if (!res.ok) {
        const e = await res.json() as { error?: string }
        throw new Error(e.error ?? 'Erro ao gerar plano')
      }

      const json = await res.json() as { plan?: { dias: DiaAPI[] } }
      if (!json.plan?.dias?.length) throw new Error('Plano vazio retornado pela IA.')

      setDone(true)
      setTimeout(() => onSuccess(diasToWeekPlan(userId, weekStart, json.plan!.dias)), 700)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido.')
      setGenerating(false)
    }
  }

  if (!isOpen) return null

  // ── Generating view ────────────────────────────────────────────────────────
  if (generating) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="relative w-full max-w-md rounded-2xl bg-[#1C2128] shadow-2xl border border-[#2D333B]">
          <ProgressView progress100={done} message={done ? 'Pronto! Aplicando seu plano…' : undefined} />
        </div>
      </div>
    )
  }

  // ── Food selection view ────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop — not closeable while generating */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-2xl bg-[#1C2128] shadow-2xl border border-[#2D333B] flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2D333B] px-6 py-4">
          <div>
            <h2 className="font-bold text-[#E6EDF3]">O que você tem em casa?</h2>
            <p className="mt-0.5 text-xs text-[#8B949E]">A IA monta o cardápio priorizando esses ingredientes</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#8B949E] hover:bg-[#2D333B] hover:text-[#E6EDF3] transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Counter */}
        {selecionados.length > 0 && (
          <div className="flex items-center justify-between border-b border-[#2D333B] px-6 py-2.5 bg-brand/5">
            <span className="text-xs font-semibold text-brand">
              {selecionados.length} {selecionados.length === 1 ? 'item selecionado' : 'itens selecionados'}
            </span>
            <button onClick={() => setSelecionados([])} className="text-xs text-[#8B949E] hover:text-[#E6EDF3] underline">
              Limpar tudo
            </button>
          </div>
        )}

        {/* Food grid */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {ALIMENTOS_CATEGORIAS.map(cat => (
            <div key={cat.label}>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8B949E]">
                <span>{cat.emoji}</span> {cat.label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {cat.items.map(item => {
                  const on = selecionados.includes(item)
                  return (
                    <button key={item} type="button" onClick={() => toggle(item)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                        on
                          ? 'border-brand bg-brand text-white'
                          : 'border-[#2D333B] bg-[#161B22] text-[#8B949E] hover:border-brand/40 hover:bg-brand/5',
                      )}>
                      {on && <Check className="h-3 w-3" />}
                      {item}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-[#2D333B] px-6 py-4 space-y-3">
          {error && <p className="text-xs text-red-500 text-center">{error}</p>}
          <button
            onClick={handleGenerate}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white hover:bg-brand-600 transition-colors shadow-sm"
          >
            <Sparkles className="h-4 w-4" />
            Gerar dieta da semana
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Animated progress view ───────────────────────────────────────────────────

function ProgressView({ progress100, message }: { progress100: boolean; message?: string }) {
  const [progress, setProgress] = useState(0)
  const [msgIdx,   setMsgIdx]   = useState(0)
  const startRef = useRef(Date.now())

  useEffect(() => {
    const tick = setInterval(() => {
      const elapsed = Date.now() - startRef.current
      const raw     = Math.min(1, elapsed / DURATION_MS)
      // Ease-out curve: starts fast, slows as it approaches 88%
      const pct = Math.round(88 * (1 - Math.pow(1 - raw, 2.5)))
      setProgress(pct)
      const idx = Math.min(MESSAGES.length - 1, Math.floor(raw * MESSAGES.length))
      setMsgIdx(idx)
    }, 250)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    if (progress100) setProgress(100)
  }, [progress100])

  const label = progress100 && message ? message : MESSAGES[msgIdx]

  return (
    <div className="flex flex-col items-center justify-center px-8 py-12 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10">
        {progress100
          ? <Check className="h-8 w-8 text-brand" />
          : <Sparkles className="h-8 w-8 text-brand animate-pulse" />}
      </div>

      <h3 className="text-lg font-bold text-[#E6EDF3]">
        {progress100 ? 'Plano criado!' : 'Gerando sua dieta personalizada'}
      </h3>
      <p className="mt-1 text-xs text-[#8B949E]">
        {progress100 ? 'Aplicando ao seu calendário…' : 'Nossa IA está montando o cardápio ideal para você'}
      </p>

      {/* Progress bar */}
      <div className="mt-8 w-full">
        <div className="mb-2 flex justify-between text-xs font-semibold">
          <span className="text-brand truncate pr-2">{label}</span>
          <span className="shrink-0 text-[#8B949E]">{progress}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#2D333B]">
          <div
            className={cn(
              'h-full rounded-full transition-all ease-out',
              progress100 ? 'bg-green-500 duration-500' : 'bg-brand duration-300',
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {!progress100 && (
        <p className="mt-6 text-xs text-[#8B949E]">Isso pode levar até 1 minuto. Não feche esta janela.</p>
      )}
    </div>
  )
}
