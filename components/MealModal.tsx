'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Check,
  Flame,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getRecipes } from '@/lib/store'
import type { MacroInfo, MealSlot, MealType } from '@/types'

// ─── Local types ──────────────────────────────────────────────────────────────

interface FoodItem {
  id: string
  name: string
  emoji: string
  caloriesPer100g: number
  macrosPer100g: MacroInfo
  defaultGrams: number
  isRecipe?: boolean
}

interface SelectedItem {
  food: FoodItem
  grams: number
}

interface Totals {
  calories: number
  protein: number
  carbs: number
  fat: number
}

interface CustomDraft {
  name: string
  calories: string
  protein: string
  carbs: string
  fat: string
}

type View = 'search' | 'custom'

// ─── Food database (per 100g) ─────────────────────────────────────────────────

const FOODS: FoodItem[] = [
  // Proteínas
  { id: 'p1', emoji: '🍗', name: 'Frango grelhado',         caloriesPer100g: 165, macrosPer100g: { protein: 31,  carbs: 0,   fat: 3.6  }, defaultGrams: 150 },
  { id: 'p2', emoji: '🐟', name: 'Salmão ao forno',          caloriesPer100g: 208, macrosPer100g: { protein: 20,  carbs: 0,   fat: 13   }, defaultGrams: 120 },
  { id: 'p3', emoji: '🥚', name: 'Ovo cozido',               caloriesPer100g: 155, macrosPer100g: { protein: 13,  carbs: 1.1, fat: 11   }, defaultGrams: 60  },
  { id: 'p4', emoji: '🐄', name: 'Patinho moído',            caloriesPer100g: 215, macrosPer100g: { protein: 26,  carbs: 0,   fat: 12   }, defaultGrams: 120 },
  { id: 'p5', emoji: '🐟', name: 'Tilápia grelhada',         caloriesPer100g: 128, macrosPer100g: { protein: 26,  carbs: 0,   fat: 2.7  }, defaultGrams: 150 },
  { id: 'p6', emoji: '🫘', name: 'Feijão cozido',            caloriesPer100g: 77,  macrosPer100g: { protein: 5,   carbs: 14,  fat: 0.5  }, defaultGrams: 100 },
  { id: 'p7', emoji: '🫘', name: 'Lentilha cozida',          caloriesPer100g: 116, macrosPer100g: { protein: 9,   carbs: 20,  fat: 0.4  }, defaultGrams: 100 },
  // Carboidratos
  { id: 'c1', emoji: '🍚', name: 'Arroz integral cozido',    caloriesPer100g: 111, macrosPer100g: { protein: 2.6, carbs: 23,  fat: 0.9  }, defaultGrams: 150 },
  { id: 'c2', emoji: '🍚', name: 'Arroz branco cozido',      caloriesPer100g: 130, macrosPer100g: { protein: 2.7, carbs: 28,  fat: 0.3  }, defaultGrams: 150 },
  { id: 'c3', emoji: '🍠', name: 'Batata-doce cozida',       caloriesPer100g: 86,  macrosPer100g: { protein: 1.6, carbs: 20,  fat: 0.1  }, defaultGrams: 150 },
  { id: 'c4', emoji: '🌾', name: 'Aveia em flocos',          caloriesPer100g: 389, macrosPer100g: { protein: 17,  carbs: 66,  fat: 7    }, defaultGrams: 50  },
  { id: 'c5', emoji: '🌾', name: 'Quinoa cozida',            caloriesPer100g: 120, macrosPer100g: { protein: 4.4, carbs: 21,  fat: 1.9  }, defaultGrams: 100 },
  { id: 'c6', emoji: '🍝', name: 'Macarrão integral cozido', caloriesPer100g: 124, macrosPer100g: { protein: 5,   carbs: 25,  fat: 0.9  }, defaultGrams: 150 },
  { id: 'c7', emoji: '🌽', name: 'Mandioca cozida',          caloriesPer100g: 125, macrosPer100g: { protein: 1,   carbs: 30,  fat: 0.3  }, defaultGrams: 100 },
  // Vegetais
  { id: 'v1', emoji: '🥦', name: 'Brócolis cozido',          caloriesPer100g: 35,  macrosPer100g: { protein: 2.4, carbs: 7,   fat: 0.4  }, defaultGrams: 100 },
  { id: 'v2', emoji: '🥬', name: 'Espinafre refogado',       caloriesPer100g: 28,  macrosPer100g: { protein: 2.9, carbs: 3.6, fat: 0.4  }, defaultGrams: 80  },
  { id: 'v3', emoji: '🥒', name: 'Abobrinha cozida',         caloriesPer100g: 17,  macrosPer100g: { protein: 1.2, carbs: 3.5, fat: 0.3  }, defaultGrams: 100 },
  { id: 'v4', emoji: '🥗', name: 'Couve refogada',           caloriesPer100g: 32,  macrosPer100g: { protein: 2.9, carbs: 6,   fat: 0.7  }, defaultGrams: 80  },
  // Laticínios
  { id: 'd1', emoji: '🥛', name: 'Iogurte grego natural',    caloriesPer100g: 59,  macrosPer100g: { protein: 10,  carbs: 3.6, fat: 0.4  }, defaultGrams: 170 },
  { id: 'd2', emoji: '🧀', name: 'Queijo cottage',           caloriesPer100g: 98,  macrosPer100g: { protein: 11,  carbs: 3.4, fat: 4.3  }, defaultGrams: 100 },
  { id: 'd3', emoji: '🥛', name: 'Leite desnatado',          caloriesPer100g: 34,  macrosPer100g: { protein: 3.4, carbs: 5,   fat: 0.1  }, defaultGrams: 200 },
  // Frutas
  { id: 'f1', emoji: '🍌', name: 'Banana',                   caloriesPer100g: 89,  macrosPer100g: { protein: 1.1, carbs: 23,  fat: 0.3  }, defaultGrams: 120 },
  { id: 'f2', emoji: '🍎', name: 'Maçã',                     caloriesPer100g: 52,  macrosPer100g: { protein: 0.3, carbs: 14,  fat: 0.2  }, defaultGrams: 150 },
  { id: 'f3', emoji: '🍓', name: 'Morango',                  caloriesPer100g: 32,  macrosPer100g: { protein: 0.7, carbs: 7.7, fat: 0.3  }, defaultGrams: 100 },
  { id: 'f4', emoji: '🫐', name: 'Mirtilo',                  caloriesPer100g: 57,  macrosPer100g: { protein: 0.7, carbs: 14,  fat: 0.3  }, defaultGrams: 80  },
  // Gorduras boas
  { id: 'g1', emoji: '🥑', name: 'Abacate',                  caloriesPer100g: 160, macrosPer100g: { protein: 2,   carbs: 9,   fat: 15   }, defaultGrams: 80  },
  { id: 'g2', emoji: '🫒', name: 'Azeite de oliva',          caloriesPer100g: 884, macrosPer100g: { protein: 0,   carbs: 0,   fat: 100  }, defaultGrams: 10  },
  { id: 'g3', emoji: '🌰', name: 'Castanha-do-Pará',         caloriesPer100g: 659, macrosPer100g: { protein: 14,  carbs: 12,  fat: 67   }, defaultGrams: 30  },
  { id: 'g4', emoji: '🥜', name: 'Mix de castanhas',         caloriesPer100g: 607, macrosPer100g: { protein: 15,  carbs: 22,  fat: 54   }, defaultGrams: 30  },
]

// ─── Constants ────────────────────────────────────────────────────────────────

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Café da manhã',
  snack:     'Lanche',
  lunch:     'Almoço',
  dinner:    'Jantar',
}

const MEAL_EMOJIS: Record<MealType, string> = {
  breakfast: '☀️',
  snack:     '🍎',
  lunch:     '🍽️',
  dinner:    '🌙',
}

const EMPTY_DRAFT: CustomDraft = { name: '', calories: '', protein: '', carbs: '', fat: '' }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function itemTotals(item: SelectedItem): Totals {
  const r = item.grams / 100
  return {
    calories: Math.round(item.food.caloriesPer100g * r),
    protein:  Math.round(item.food.macrosPer100g.protein * r * 10) / 10,
    carbs:    Math.round(item.food.macrosPer100g.carbs   * r * 10) / 10,
    fat:      Math.round(item.food.macrosPer100g.fat     * r * 10) / 10,
  }
}

function sumTotals(items: SelectedItem[]): Totals {
  return items.reduce(
    (acc, item) => {
      const m = itemTotals(item)
      return {
        calories: acc.calories + m.calories,
        protein:  Math.round((acc.protein + m.protein) * 10) / 10,
        carbs:    Math.round((acc.carbs   + m.carbs)   * 10) / 10,
        fat:      Math.round((acc.fat     + m.fat)     * 10) / 10,
      }
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NumberField({
  label, unit, value, onChange,
}: {
  label: string; unit: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#8B949E]">{label}</label>
      <div className="relative">
        <input
          type="number"
          min="0"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full rounded-xl border border-surface-border py-2.5 pl-3.5 pr-10 text-sm text-[#E6EDF3] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[#8B949E]">
          {unit}
        </span>
      </div>
    </div>
  )
}

function MacroTile({
  label, value, color, bg,
}: {
  label: string; value: number; color: string; bg: string
}) {
  return (
    <div className={cn('flex-1 rounded-xl p-3 text-center', bg)}>
      <p className={cn('text-xl font-bold leading-none', color)}>
        {value}<span className="text-sm font-medium">g</span>
      </p>
      <p className="mt-1 text-[11px] font-medium text-[#8B949E]">{label}</p>
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface MealModalProps {
  isOpen: boolean
  date: string         // YYYY-MM-DD
  mealType: MealType
  existingSlot?: MealSlot
  weekStart?: string
  onClose: () => void
  onSave: (slot: Omit<MealSlot, 'id'>) => void
  onDelete?: () => void
}

// ─── MealModal ────────────────────────────────────────────────────────────────

export function MealModal({
  isOpen,
  date,
  mealType,
  existingSlot,
  onClose,
  onSave,
  onDelete,
}: MealModalProps) {
  // Animation states: rendered keeps DOM alive during exit, visible drives CSS
  const [rendered, setRendered] = useState(false)
  const [visible,  setVisible]  = useState(false)

  const [view,          setView]          = useState<View>('search')
  const [query,         setQuery]         = useState('')
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])
  const [mealName,      setMealName]      = useState('')
  const [draft,         setDraft]         = useState<CustomDraft>(EMPTY_DRAFT)

  const searchRef = useRef<HTMLInputElement>(null)

  // ── Animation lifecycle ────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setRendered(true)
      const frame = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(frame)
    } else {
      setVisible(false)
      const timer = setTimeout(() => setRendered(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // ── Keyboard close ─────────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', onKey)
      return () => document.removeEventListener('keydown', onKey)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // ── Populate from existingSlot ─────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    if (existingSlot) {
      setMealName(existingSlot.name)
      setSelectedItems([{
        food: {
          id: existingSlot.id,
          name: existingSlot.name,
          emoji: '🍽️',
          caloriesPer100g: existingSlot.calories,
          macrosPer100g: existingSlot.macros,
          defaultGrams: 100,
        },
        grams: 100,
      }])
    } else {
      resetForm()
    }
  }, [isOpen, existingSlot])

  // ── Auto-focus search ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && view === 'search') {
      const t = setTimeout(() => searchRef.current?.focus(), 320)
      return () => clearTimeout(t)
    }
  }, [isOpen, view])

  // ── Handlers ───────────────────────────────────────────────────────────────
  function resetForm() {
    setView('search')
    setQuery('')
    setSelectedItems([])
    setMealName('')
    setDraft(EMPTY_DRAFT)
  }

  function handleClose() {
    onClose()
    setTimeout(resetForm, 300)
  }

  function addFood(food: FoodItem) {
    setSelectedItems(prev => {
      const existing = prev.find(i => i.food.id === food.id)
      if (existing) {
        return prev.map(i =>
          i.food.id === food.id
            ? { ...i, grams: i.grams + food.defaultGrams }
            : i,
        )
      }
      return [...prev, { food, grams: food.defaultGrams }]
    })
    setMealName(n => n || food.name)
  }

  function removeItem(foodId: string) {
    setSelectedItems(prev => prev.filter(i => i.food.id !== foodId))
  }

  function adjustGrams(foodId: string, delta: number) {
    setSelectedItems(prev =>
      prev
        .map(i => i.food.id === foodId ? { ...i, grams: Math.max(0, i.grams + delta) } : i)
        .filter(i => i.grams > 0),
    )
  }

  function addCustomFood() {
    if (!draft.name.trim() || !draft.calories) return
    const food: FoodItem = {
      id:              `custom-${Date.now()}`,
      name:            draft.name.trim(),
      emoji:           '🍽️',
      caloriesPer100g: Number(draft.calories),
      macrosPer100g:   {
        protein: Number(draft.protein) || 0,
        carbs:   Number(draft.carbs)   || 0,
        fat:     Number(draft.fat)     || 0,
      },
      defaultGrams: 100,
    }
    addFood(food)
    setDraft(EMPTY_DRAFT)
    setView('search')
  }

  function handleSave() {
    if (selectedItems.length === 0) return
    const t = sumTotals(selectedItems)
    onSave({
      mealType,
      name:     mealName.trim() || selectedItems[0].food.name,
      calories: t.calories,
      macros:   { protein: t.protein, carbs: t.carbs, fat: t.fat },
    })
    handleClose()
  }

  // ── Derived state ──────────────────────────────────────────────────────────
  const q = query.toLowerCase().trim()

  // User recipes converted to FoodItem format (shown first)
  const recipeItems: FoodItem[] = useMemo(() => getRecipes()
    .filter(r => !q || r.nome.toLowerCase().includes(q))
    .slice(0, 3)
    .map(r => ({
      id:              `recipe-${r.id}`,
      name:            r.nome,
      emoji:           r.emoji,
      caloriesPer100g: r.calorias,
      macrosPer100g:   { protein: r.proteina, carbs: r.carbs, fat: r.gordura },
      defaultGrams:    100,
      isRecipe:        true,
    })), [q])

  const foodItems = FOODS
    .filter(f => !q || f.name.toLowerCase().includes(q))
    .slice(0, Math.max(0, 9 - recipeItems.length))

  const results: FoodItem[] = [...recipeItems, ...foodItems]

  const totals   = sumTotals(selectedItems)
  const hasItems = selectedItems.length > 0

  const dateLabel = date
    ? new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', {
        weekday: 'long', day: '2-digit', month: 'long',
      })
    : ''

  // Macro % for the bar
  const protPct  = totals.calories > 0 ? Math.round((totals.protein * 4) / totals.calories * 100) : 0
  const carbsPct = totals.calories > 0 ? Math.round((totals.carbs   * 4) / totals.calories * 100) : 0

  if (!rendered) return null

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4',
        'transition-opacity duration-300',
        visible ? 'opacity-100' : 'opacity-0',
      )}
    >
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={handleClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal
        aria-label="Adicionar refeição"
        className={cn(
          'relative z-10 flex w-full flex-col overflow-hidden bg-surface',
          'rounded-t-2xl sm:max-w-lg sm:rounded-2xl',
          'max-h-[92dvh] sm:max-h-[88vh]',
          'shadow-2xl ring-1 ring-black/5',
          'transition-all duration-300 ease-out',
          visible
            ? 'translate-y-0 scale-100 opacity-100'
            : 'translate-y-6 scale-[0.98] opacity-0 sm:translate-y-3',
        )}
      >

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-start justify-between border-b border-surface-border px-5 pb-4 pt-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{MEAL_EMOJIS[mealType]}</span>
              <h2 className="text-base font-bold text-[#E6EDF3]">
                {existingSlot ? 'Editar refeição' : 'Adicionar refeição'}
              </h2>
            </div>
            <p className="mt-0.5 text-xs capitalize text-[#8B949E]">
              {MEAL_LABELS[mealType]}
              {dateLabel && ` · ${dateLabel}`}
            </p>
          </div>
          <button
            onClick={handleClose}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-[#8B949E] transition-colors hover:bg-surface-hover hover:text-[#8B949E]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Scrollable body ──────────────────────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto">

          {view === 'search' ? (
            <>
              {/* Search + custom button (sticky) */}
              <div className="sticky top-0 z-10 border-b border-surface-border bg-surface px-5 pb-3 pt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B949E]" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Buscar alimento ou receita..."
                    className="w-full rounded-xl border border-surface-border bg-surface-subtle py-2.5 pl-9 pr-9 text-sm text-[#E6EDF3] placeholder:text-[#8B949E] focus:border-brand focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                  />
                  {query && (
                    <button
                      onClick={() => setQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B949E] hover:text-[#8B949E]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setView('custom')}
                  className="mt-2.5 flex w-full items-center gap-2 rounded-xl border border-dashed border-[#30363d] px-4 py-2.5 text-sm font-medium text-[#8B949E] transition-all hover:border-brand hover:bg-brand/5 hover:text-brand"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar alimento personalizado
                </button>
              </div>

              {/* Food results */}
              <ul className="space-y-1 px-5 py-3">
                {results.length === 0 ? (
                  <li className="py-10 text-center text-sm text-[#8B949E]">
                    Nenhum alimento encontrado para{' '}
                    <span className="font-medium">&ldquo;{query}&rdquo;</span>
                  </li>
                ) : results.map(food => {
                  const isAdded = selectedItems.some(i => i.food.id === food.id)
                  const preview = itemTotals({ food, grams: food.defaultGrams })
                  return (
                    <li key={food.id}>
                      <button
                        onClick={() => addFood(food)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all',
                          isAdded
                            ? 'border-brand/20 bg-brand/5'
                            : 'border-transparent hover:bg-surface-subtle',
                        )}
                      >
                        <span className="shrink-0 text-xl">{food.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className={cn(
                              'truncate text-sm font-semibold',
                              isAdded ? 'text-brand' : 'text-[#E6EDF3]',
                            )}>
                              {food.name}
                            </p>
                            {food.isRecipe && (
                              <span className="shrink-0 rounded-full bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                                Minha receita
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-[#8B949E]">
                            {food.defaultGrams}g ·{' '}
                            <span className="text-orange-500 font-medium">{preview.calories} kcal</span>
                            <span className="ml-2 text-blue-500">P {preview.protein}g</span>
                            <span className="ml-1 text-amber-500">C {preview.carbs}g</span>
                            <span className="ml-1 text-rose-500">G {preview.fat}g</span>
                          </p>
                        </div>
                        <div className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all',
                          isAdded
                            ? 'bg-brand text-white'
                            : 'bg-surface-hover text-[#8B949E] hover:bg-[#30363d]',
                        )}>
                          {isAdded
                            ? <Check className="h-3.5 w-3.5" />
                            : <Plus className="h-3.5 w-3.5" />
                          }
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          ) : (
            /* ── Custom food form ──────────────────────────────────────────── */
            <div className="px-5 py-4">
              <button
                onClick={() => setView('search')}
                className="mb-5 flex items-center gap-1.5 text-sm font-medium text-[#8B949E] transition-colors hover:text-[#E6EDF3]"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar à busca
              </button>

              <h3 className="mb-4 text-sm font-bold text-[#E6EDF3]">
                Alimento personalizado
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#8B949E]">
                    Nome do alimento
                  </label>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                    placeholder="Ex: Vitamina de banana com aveia"
                    className="w-full rounded-xl border border-surface-border px-3.5 py-2.5 text-sm text-[#E6EDF3] placeholder:text-[#8B949E] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    label="Calorias"        unit="kcal"
                    value={draft.calories}  onChange={v => setDraft(d => ({ ...d, calories: v }))}
                  />
                  <NumberField
                    label="Proteína"        unit="g"
                    value={draft.protein}   onChange={v => setDraft(d => ({ ...d, protein: v }))}
                  />
                  <NumberField
                    label="Carboidratos"    unit="g"
                    value={draft.carbs}     onChange={v => setDraft(d => ({ ...d, carbs: v }))}
                  />
                  <NumberField
                    label="Gorduras"        unit="g"
                    value={draft.fat}       onChange={v => setDraft(d => ({ ...d, fat: v }))}
                  />
                </div>

                <button
                  onClick={addCustomFood}
                  disabled={!draft.name.trim() || !draft.calories}
                  className="mt-1 w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-600 disabled:pointer-events-none disabled:opacity-40"
                >
                  Adicionar à refeição
                </button>
              </div>
            </div>
          )}

          {/* ── Selected items + macro summary ───────────────────────────── */}
          {hasItems && (
            <div className="mt-1 border-t border-surface-border px-5 pb-4 pt-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-[#8B949E]">
                  Refeição sendo montada
                </p>
                <span className="text-xs text-[#8B949E]">
                  {selectedItems.length} item{selectedItems.length !== 1 ? 'ns' : ''}
                </span>
              </div>

              {/* Meal name */}
              <input
                type="text"
                value={mealName}
                onChange={e => setMealName(e.target.value)}
                placeholder="Nome da refeição..."
                className="mb-3 w-full rounded-xl border border-surface-border bg-surface-subtle px-3.5 py-2 text-sm font-semibold text-[#E6EDF3] placeholder:font-normal placeholder:text-[#8B949E] focus:border-brand focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
              />

              {/* Item list */}
              <ul className="space-y-2">
                {selectedItems.map(item => {
                  const m = itemTotals(item)
                  return (
                    <li
                      key={item.food.id}
                      className="flex items-center gap-2.5 rounded-xl bg-surface-subtle px-3 py-2.5"
                    >
                      <span className="shrink-0 text-lg">{item.food.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-[#E6EDF3]">
                          {item.food.name}
                        </p>
                        <p className="text-[11px] text-[#8B949E]">
                          {m.calories} kcal
                        </p>
                      </div>

                      {/* Gram stepper */}
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => adjustGrams(item.food.id, -25)}
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-hover text-[#8B949E] text-sm font-bold transition-colors hover:bg-[#30363d]"
                        >
                          –
                        </button>
                        <span className="w-12 text-center text-xs font-semibold text-[#E6EDF3]">
                          {item.grams}g
                        </span>
                        <button
                          onClick={() => adjustGrams(item.food.id, +25)}
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-hover text-[#8B949E] text-sm font-bold transition-colors hover:bg-[#30363d]"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.food.id)}
                        aria-label="Remover"
                        className="ml-0.5 rounded-md p-1 text-[#30363d] transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  )
                })}
              </ul>

              {/* Macro summary card */}
              <div className="mt-4 rounded-2xl bg-surface-subtle p-4">
                {/* Calorie headline */}
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#8B949E]">
                    Resumo nutricional
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Flame className="h-4 w-4 text-orange-400" />
                    <span className="text-xl font-bold text-[#E6EDF3] leading-none">
                      {totals.calories}
                    </span>
                    <span className="text-xs font-medium text-[#8B949E]">kcal</span>
                  </div>
                </div>

                {/* Macro tiles */}
                <div className="flex gap-2">
                  <MacroTile label="Proteína"    value={totals.protein} color="text-blue-600"  bg="bg-blue-50" />
                  <MacroTile label="Carboidratos" value={totals.carbs}   color="text-amber-600" bg="bg-amber-50" />
                  <MacroTile label="Gorduras"     value={totals.fat}     color="text-rose-500"  bg="bg-rose-50" />
                </div>

                {/* Distribution bar */}
                {totals.calories > 0 && (
                  <>
                    <div className="mt-3 flex h-2 overflow-hidden rounded-full">
                      <div
                        className="bg-blue-400 transition-all duration-500"
                        style={{ width: `${protPct}%` }}
                      />
                      <div
                        className="bg-amber-400 transition-all duration-500"
                        style={{ width: `${carbsPct}%` }}
                      />
                      <div className="flex-1 bg-rose-400 transition-all duration-500" />
                    </div>
                    <div className="mt-1.5 flex gap-4">
                      {[
                        { color: 'bg-blue-400',  label: `Prot ${protPct}%` },
                        { color: 'bg-amber-400', label: `Carbs ${carbsPct}%` },
                        { color: 'bg-rose-400',  label: `Gord ${100 - protPct - carbsPct}%` },
                      ].map(({ color, label }) => (
                        <span key={label} className="flex items-center gap-1 text-[10px] text-[#8B949E]">
                          <span className={cn('inline-block h-2 w-2 rounded-full', color)} />
                          {label}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center gap-3 border-t border-surface-border bg-surface px-5 py-4">
          {onDelete && (
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </button>
          )}
          <div className="flex flex-1 items-center justify-end gap-3">
            <button
              onClick={handleClose}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-[#8B949E] transition-colors hover:bg-surface-hover"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!hasItems}
              className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-600 disabled:pointer-events-none disabled:opacity-40"
            >
              Salvar refeição
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
