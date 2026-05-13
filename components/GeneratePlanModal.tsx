'use client'

import { useState } from 'react'
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface DiaAPI {
  dia?: string
  cafe_da_manha?: { nome: string; calorias: number; proteina: number; carbs: number; gordura: number }
  lanche?:        { nome: string; calorias: number; proteina: number; carbs: number; gordura: number }
  almoco?:        { nome: string; calorias: number; proteina: number; carbs: number; gordura: number }
  jantar?:        { nome: string; calorias: number; proteina: number; carbs: number; gordura: number }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  isOpen:    boolean
  weekStart: string
  onClose:   () => void
  onSuccess: (plan: WeekPlan) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GeneratePlanModal({ isOpen, weekStart, onClose, onSuccess }: Props) {
  const profile = getProfile()
  const [selecionados, setSelecionados] = useState<string[]>(profile.alimentos_em_casa ?? [])
  const [generating,   setGenerating]   = useState(false)
  const [error,        setError]        = useState('')

  function toggle(item: string) {
    setSelecionados(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item])
  }

  async function handleGenerate() {
    setGenerating(true)
    setError('')
    try {
      const userId   = `local-${Date.now()}`
      const objetivo = profile.objetivo      ?? 'manter'
      const kcal     = profile.metas.kcal_dia    || 2000
      const prot     = profile.metas.proteina_g  || 150

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
          if (dias?.length) { onSuccess(diasToWeekPlan(userId, weekStart, dias)); return }
        }
      }

      // OpenAI fallback
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objetivo, calorias_meta: kcal, proteina_meta: prot, alimentos_em_casa: selecionados }),
      })
      if (!res.ok) { const e = await res.json() as { error?: string }; throw new Error(e.error ?? 'Erro ao gerar plano') }

      const json = await res.json() as { plan?: { dias: DiaAPI[] } }
      if (!json.plan?.dias?.length) throw new Error('Plano vazio retornado pela IA.')

      onSuccess(diasToWeekPlan(userId, weekStart, json.plan.dias))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido.')
    } finally {
      setGenerating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="font-bold text-gray-900">O que você tem em casa?</h2>
            <p className="mt-0.5 text-xs text-gray-400">A IA monta o cardápio priorizando esses ingredientes</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Counter */}
        {selecionados.length > 0 && (
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-2.5 bg-brand/5">
            <span className="text-xs font-semibold text-brand">
              {selecionados.length} {selecionados.length === 1 ? 'item selecionado' : 'itens selecionados'}
            </span>
            <button onClick={() => setSelecionados([])} className="text-xs text-gray-400 hover:text-gray-600 underline">
              Limpar tudo
            </button>
          </div>
        )}

        {/* Food grid */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {ALIMENTOS_CATEGORIAS.map(cat => (
            <div key={cat.label}>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
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
                          : 'border-gray-200 bg-white text-gray-600 hover:border-brand/40 hover:bg-brand/5',
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
        <div className="border-t border-gray-100 px-6 py-4 space-y-3">
          {error && <p className="text-xs text-red-500 text-center">{error}</p>}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors shadow-sm"
          >
            <Sparkles className="h-4 w-4" />
            {generating ? 'Gerando seu plano…' : 'Gerar dieta da semana'}
          </button>
        </div>
      </div>
    </div>
  )
}
