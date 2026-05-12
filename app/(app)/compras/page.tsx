'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  ClipboardCopy,
  Loader2,
  Pencil,
  RefreshCw,
  Share2,
  ShoppingCart,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { getWeekPlanWithSlots } from '@/lib/db'

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = 'proteinas' | 'vegetais' | 'laticinios' | 'cereais' | 'outros'

interface CatalogItem {
  id: string
  name: string
  category: Category
  qty: string
  weeklyPrice: number
  keywords: string[]
}

// ─── Ingredient catalog ───────────────────────────────────────────────────────

const CATALOG: CatalogItem[] = [
  // Proteínas
  { id: 'frango',      name: 'Filé de frango',        category: 'proteinas',  qty: '800g',    weeklyPrice: 19.00, keywords: ['frango', 'peito de frango', 'frango grelhado', 'frango ao'] },
  { id: 'carne-moida', name: 'Carne moída',            category: 'proteinas',  qty: '500g',    weeklyPrice: 17.50, keywords: ['carne moída', 'carne bovina', 'carne moi'] },
  { id: 'salmon',      name: 'Salmão',                 category: 'proteinas',  qty: '400g',    weeklyPrice: 38.00, keywords: ['salmão', 'salmon'] },
  { id: 'tilapia',     name: 'Tilápia',                category: 'proteinas',  qty: '500g',    weeklyPrice: 22.00, keywords: ['tilápia', 'tilapia'] },
  { id: 'ovos',        name: 'Ovos',                   category: 'proteinas',  qty: '1 dúzia', weeklyPrice: 14.40, keywords: ['ovo ', 'omelete', 'ovo mexido', 'panqueca', 'ovos'] },
  { id: 'atum',        name: 'Atum em lata',            category: 'proteinas',  qty: '2 un',    weeklyPrice: 10.00, keywords: ['atum em', 'atum na'] },
  { id: 'camarao',     name: 'Camarão',                category: 'proteinas',  qty: '300g',    weeklyPrice: 36.00, keywords: ['camarão', 'camarao'] },
  { id: 'patinho',     name: 'Patinho bovino',          category: 'proteinas',  qty: '500g',    weeklyPrice: 24.00, keywords: ['patinho', 'bife', 'alcatra'] },

  // Vegetais
  { id: 'brocolis',         name: 'Brócolis',          category: 'vegetais',   qty: '400g',    weeklyPrice: 4.80,  keywords: ['brócolis', 'brocolis'] },
  { id: 'couve',            name: 'Couve',             category: 'vegetais',   qty: '1 maço',  weeklyPrice: 3.50,  keywords: ['couve'] },
  { id: 'espinafre',        name: 'Espinafre',         category: 'vegetais',   qty: '200g',    weeklyPrice: 5.90,  keywords: ['espinafre'] },
  { id: 'abobrinha',        name: 'Abobrinha',         category: 'vegetais',   qty: '500g',    weeklyPrice: 5.00,  keywords: ['abobrinha'] },
  { id: 'cenoura',          name: 'Cenoura',           category: 'vegetais',   qty: '500g',    weeklyPrice: 3.50,  keywords: ['cenoura'] },
  { id: 'tomate',           name: 'Tomate',            category: 'vegetais',   qty: '500g',    weeklyPrice: 5.50,  keywords: ['tomate'] },
  { id: 'alface',           name: 'Alface',            category: 'vegetais',   qty: '1 pé',    weeklyPrice: 3.00,  keywords: ['alface', 'salada verde'] },
  { id: 'batata-doce',      name: 'Batata-doce',       category: 'vegetais',   qty: '600g',    weeklyPrice: 6.00,  keywords: ['batata-doce', 'batata doce'] },
  { id: 'mandioca',         name: 'Mandioca',          category: 'vegetais',   qty: '500g',    weeklyPrice: 3.50,  keywords: ['mandioca', 'aipim', 'macaxeira'] },
  { id: 'frutas-vermelhas', name: 'Frutas vermelhas',  category: 'vegetais',   qty: '300g',    weeklyPrice: 22.00, keywords: ['frutas vermelhas', 'morango', 'mirtilo'] },
  { id: 'banana',           name: 'Banana',            category: 'vegetais',   qty: '6 un',    weeklyPrice: 4.50,  keywords: ['banana'] },
  { id: 'maca',             name: 'Maçã',              category: 'vegetais',   qty: '4 un',    weeklyPrice: 8.00,  keywords: ['maçã', 'maca '] },
  { id: 'pepino',           name: 'Pepino',            category: 'vegetais',   qty: '2 un',    weeklyPrice: 3.00,  keywords: ['pepino'] },
  { id: 'beterraba',        name: 'Beterraba',         category: 'vegetais',   qty: '3 un',    weeklyPrice: 4.50,  keywords: ['beterraba'] },

  // Laticínios
  { id: 'iogurte-grego',  name: 'Iogurte grego',           category: 'laticinios', qty: '2 un',  weeklyPrice: 13.00, keywords: ['iogurte grego', 'iogurte natural'] },
  { id: 'queijo-minas',   name: 'Queijo minas frescal',     category: 'laticinios', qty: '400g', weeklyPrice: 17.00, keywords: ['queijo minas', 'queijo frescal', 'queijo e ', 'queijo,'] },
  { id: 'queijo-cottage', name: 'Queijo cottage',           category: 'laticinios', qty: '200g', weeklyPrice: 8.50,  keywords: ['queijo cottage', 'cottage'] },
  { id: 'leite',          name: 'Leite desnatado',          category: 'laticinios', qty: '1L',   weeklyPrice: 4.90,  keywords: ['leite'] },
  { id: 'manteiga',       name: 'Manteiga s/ sal',          category: 'laticinios', qty: '200g', weeklyPrice: 9.00,  keywords: ['manteiga'] },
  { id: 'requeijao',      name: 'Requeijão light',          category: 'laticinios', qty: '200g', weeklyPrice: 7.50,  keywords: ['requeijão', 'requeijao'] },

  // Cereais
  { id: 'arroz-integral',    name: 'Arroz integral',       category: 'cereais', qty: '1kg',   weeklyPrice: 8.00,  keywords: ['arroz integral', 'arroz'] },
  { id: 'feijao',            name: 'Feijão carioca',       category: 'cereais', qty: '500g',  weeklyPrice: 5.50,  keywords: ['feijão', 'feijao'] },
  { id: 'quinoa',            name: 'Quinoa',               category: 'cereais', qty: '400g',  weeklyPrice: 19.00, keywords: ['quinoa'] },
  { id: 'aveia',             name: 'Aveia em flocos',      category: 'cereais', qty: '500g',  weeklyPrice: 8.90,  keywords: ['aveia'] },
  { id: 'granola',           name: 'Granola',              category: 'cereais', qty: '300g',  weeklyPrice: 15.00, keywords: ['granola'] },
  { id: 'macarrao-integral', name: 'Macarrão integral',    category: 'cereais', qty: '500g',  weeklyPrice: 6.50,  keywords: ['macarrão integral', 'macarrao integral'] },
  { id: 'tapioca',           name: 'Goma de tapioca',      category: 'cereais', qty: '500g',  weeklyPrice: 7.90,  keywords: ['tapioca'] },
  { id: 'pao-integral',      name: 'Pão integral',         category: 'cereais', qty: '1 un',  weeklyPrice: 12.00, keywords: ['pão integral', 'torrada integral', 'torrada'] },
  { id: 'lentilha',          name: 'Lentilha',             category: 'cereais', qty: '500g',  weeklyPrice: 8.90,  keywords: ['lentilha'] },
  { id: 'grao-de-bico',      name: 'Grão-de-bico',         category: 'cereais', qty: '400g',  weeklyPrice: 9.00,  keywords: ['grão-de-bico', 'grao-de-bico', 'grao de bico'] },

  // Outros
  { id: 'azeite',        name: 'Azeite de oliva',    category: 'outros', qty: '500ml',   weeklyPrice: 29.00, keywords: ['azeite'] },
  { id: 'mel',           name: 'Mel',                category: 'outros', qty: '300g',    weeklyPrice: 15.00, keywords: ['mel '] },
  { id: 'castanhas',     name: 'Mix de castanhas',   category: 'outros', qty: '200g',    weeklyPrice: 22.00, keywords: ['castanhas', 'mix de castanhas'] },
  { id: 'molho-tomate',  name: 'Molho de tomate',    category: 'outros', qty: '2 un',    weeklyPrice: 8.00,  keywords: ['sugo', 'molho de tomate', 'ao sugo'] },
  { id: 'limao',         name: 'Limão',              category: 'outros', qty: '6 un',    weeklyPrice: 3.00,  keywords: ['limão', 'limao'] },
  { id: 'alho',          name: 'Alho',               category: 'outros', qty: '1 cabeça', weeklyPrice: 4.50, keywords: [' alho'] },
  { id: 'cebola',        name: 'Cebola',             category: 'outros', qty: '500g',    weeklyPrice: 3.50,  keywords: ['cebola'] },
  { id: 'caldo-legumes', name: 'Caldo de legumes',   category: 'outros', qty: '2 un',    weeklyPrice: 4.50,  keywords: ['sopa de', 'caldo de legumes'] },
  { id: 'oleo-coco',     name: 'Óleo de coco',       category: 'outros', qty: '200ml',   weeklyPrice: 16.00, keywords: ['óleo de coco', 'oleo de coco'] },
]

const CATEGORY_META: Record<Category, { label: string; emoji: string; order: number }> = {
  proteinas:  { label: 'Proteínas',  emoji: '🥩', order: 0 },
  vegetais:   { label: 'Vegetais',   emoji: '🥦', order: 1 },
  laticinios: { label: 'Laticínios', emoji: '🥛', order: 2 },
  cereais:    { label: 'Cereais',    emoji: '🌾', order: 3 },
  outros:     { label: 'Outros',     emoji: '🏪', order: 4 },
}

// ─── Demo meals (shown when no Supabase data available) ───────────────────────

const DEMO_MEAL_NAMES = [
  'Aveia com frutas vermelhas',
  'Frango grelhado, arroz integral e brócolis',
  'Salmão ao forno com batata-doce',
  'Omelete com espinafre',
  'Iogurte grego com granola',
  'Bowl de quinoa com legumes',
  'Carne moída com abobrinha',
  'Macarrão integral ao sugo',
  'Panqueca de banana',
  'Mix de castanhas',
  'Tilápia com purê de mandioca',
  'Sopa de lentilha',
  'Tapioca com queijo e tomate',
  'Peito de frango com feijão e couve',
  'Ovo mexido com torrada integral',
]

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getMondayOf(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return d
}

function toLocalISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function fmtDay(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function fmtBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ─── Shopping list builder ────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function generateList(mealNames: string[]): CatalogItem[] {
  const combined = ' ' + mealNames.map(n => normalize(n)).join(' ') + ' '
  const found = new Set<string>()
  const result: CatalogItem[] = []

  for (const item of CATALOG) {
    for (const kw of item.keywords) {
      if (combined.includes(normalize(kw))) {
        if (!found.has(item.id)) {
          found.add(item.id)
          result.push(item)
        }
        break
      }
    }
  }

  return result
}

function formatListText(
  items: CatalogItem[],
  prices: Record<string, number>,
  checked: Set<string>,
  weekLabel: string,
): string {
  const lines: string[] = [
    `LISTA DE COMPRAS — ${weekLabel}`,
    '',
  ]

  const byCategory = groupByCategory(items)

  for (const category of Object.keys(CATEGORY_META) as Category[]) {
    const group = byCategory[category] ?? []
    if (group.length === 0) continue

    lines.push(CATEGORY_META[category].label.toUpperCase())
    for (const item of group) {
      const price = prices[item.id] ?? item.weeklyPrice
      const mark = checked.has(item.id) ? '✓' : '☐'
      const name = `${mark} ${item.name}`.padEnd(30, ' ')
      const qty = item.qty.padEnd(10, ' ')
      lines.push(`${name}${qty}${fmtBRL(price)}`)
    }
    lines.push('')
  }

  const total = items.reduce((s, i) => s + (prices[i.id] ?? i.weeklyPrice), 0)
  const done  = items.filter(i => checked.has(i.id)).reduce((s, i) => s + (prices[i.id] ?? i.weeklyPrice), 0)

  lines.push('—'.repeat(40))
  lines.push(`Total estimado: ${fmtBRL(total)}`)
  lines.push(`Já comprado:    ${fmtBRL(done)}`)
  lines.push(`Restante:       ${fmtBRL(total - done)}`)
  lines.push('')
  lines.push('Gerado pelo NutriWeek')

  return lines.join('\n')
}

function groupByCategory(items: CatalogItem[]): Partial<Record<Category, CatalogItem[]>> {
  const groups: Partial<Record<Category, CatalogItem[]>> = {}
  for (const item of items) {
    ;(groups[item.category] ??= []).push(item)
  }
  return groups
}

// ─── localStorage keys ────────────────────────────────────────────────────────

const LS_PRICES = 'nutriweek:shopping:prices'
function lsCheckedKey(weekStart: string) { return `nutriweek:shopping:checked:${weekStart}` }

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="h-5 w-5 rounded bg-gray-200 shrink-0" />
      <div className="flex-1 h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-4 w-12 bg-gray-200 rounded" />
      <div className="h-4 w-16 bg-gray-200 rounded" />
    </div>
  )
}

interface ItemRowProps {
  item: CatalogItem
  checked: boolean
  price: number
  isEditing: boolean
  editValue: string
  onToggle: () => void
  onEditStart: () => void
  onEditChange: (v: string) => void
  onEditCommit: () => void
}

function ItemRow({
  item, checked, price, isEditing, editValue,
  onToggle, onEditStart, onEditChange, onEditCommit,
}: ItemRowProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 transition-colors',
        checked ? 'bg-gray-50' : 'hover:bg-gray-50/60',
      )}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        aria-label={checked ? 'Desmarcar' : 'Marcar como comprado'}
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all',
          checked
            ? 'border-brand bg-brand text-white'
            : 'border-gray-300 hover:border-brand',
        )}
      >
        {checked && <Check className="h-3 w-3" strokeWidth={3} />}
      </button>

      {/* Name */}
      <span className={cn(
        'flex-1 text-sm font-medium leading-tight',
        checked ? 'text-gray-400 line-through' : 'text-gray-800',
      )}>
        {item.name}
      </span>

      {/* Quantity */}
      <span className="text-xs text-gray-400 min-w-[52px] text-right">{item.qty}</span>

      {/* Price — editable */}
      <div className="min-w-[72px] text-right">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={e => onEditChange(e.target.value)}
            onBlur={onEditCommit}
            onKeyDown={e => e.key === 'Enter' && onEditCommit()}
            className="w-20 rounded border border-brand px-1.5 py-0.5 text-right text-xs font-semibold text-brand focus:outline-none"
          />
        ) : (
          <button
            onClick={onEditStart}
            title="Editar preço"
            className={cn(
              'group flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold transition-colors',
              checked ? 'text-gray-400' : 'text-gray-700 hover:bg-brand/5 hover:text-brand',
            )}
          >
            {fmtBRL(price)}
            <Pencil className="h-2.5 w-2.5 opacity-0 group-hover:opacity-60 transition-opacity" />
          </button>
        )}
      </div>
    </div>
  )
}

interface CategorySectionProps {
  category: Category
  items: CatalogItem[]
  checked: Set<string>
  prices: Record<string, number>
  editingId: string | null
  editValue: string
  onToggle: (id: string) => void
  onEditStart: (item: CatalogItem) => void
  onEditChange: (v: string) => void
  onEditCommit: () => void
}

function CategorySection({
  category, items, checked, prices, editingId, editValue,
  onToggle, onEditStart, onEditChange, onEditCommit,
}: CategorySectionProps) {
  const meta = CATEGORY_META[category]
  const subtotal = items.reduce((s, i) => s + (prices[i.id] ?? i.weeklyPrice), 0)
  const doneCount = items.filter(i => checked.has(i.id)).length

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Category header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-base">{meta.emoji}</span>
          <h3 className="text-sm font-bold text-gray-800">{meta.label}</h3>
          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-600">
            {items.length}
          </span>
          {doneCount > 0 && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
              {doneCount} ✓
            </span>
          )}
        </div>
        <span className="text-xs font-semibold text-gray-500">
          {fmtBRL(subtotal)}
        </span>
      </div>

      {/* Items */}
      <div className="divide-y divide-gray-50">
        {items.map(item => (
          <ItemRow
            key={item.id}
            item={item}
            checked={checked.has(item.id)}
            price={prices[item.id] ?? item.weeklyPrice}
            isEditing={editingId === item.id}
            editValue={editValue}
            onToggle={() => onToggle(item.id)}
            onEditStart={() => onEditStart(item)}
            onEditChange={onEditChange}
            onEditCommit={onEditCommit}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ComprasPage() {
  const [mealNames,   setMealNames]   = useState<string[]>([])
  const [isDemo,      setIsDemo]      = useState(false)
  const [loading,     setLoading]     = useState(true)
  const [weekStart,   setWeekStart]   = useState<Date>(() => getMondayOf(new Date()))

  const [checked,     setChecked]     = useState<Set<string>>(new Set())
  const [prices,      setPrices]      = useState<Record<string, number>>({})
  const [editingId,   setEditingId]   = useState<string | null>(null)
  const [editValue,   setEditValue]   = useState('')

  const [copyState,   setCopyState]   = useState<'idle' | 'copied'>('idle')
  const [shareState,  setShareState]  = useState<'idle' | 'shared'>('idle')

  // ── Derived ──────────────────────────────────────────────────────────────

  const items = useMemo(() => generateList(mealNames), [mealNames])

  const byCategory = useMemo(() => groupByCategory(items), [items])

  const weekLabel = useMemo(() => {
    const end = new Date(weekStart)
    end.setDate(end.getDate() + 6)
    return `${fmtDay(weekStart)} – ${fmtDay(end)}`
  }, [weekStart])

  const weekStartStr = useMemo(() => toLocalISODate(weekStart), [weekStart])

  const totals = useMemo(() => {
    const total   = items.reduce((s, i) => s + (prices[i.id] ?? i.weeklyPrice), 0)
    const done    = items.filter(i => checked.has(i.id)).reduce((s, i) => s + (prices[i.id] ?? i.weeklyPrice), 0)
    const pending = total - done
    return { total, done, pending, checkedCount: checked.size }
  }, [items, prices, checked])

  // ── Data fetch ────────────────────────────────────────────────────────────

  const loadMeals = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setMealNames(DEMO_MEAL_NAMES)
        setIsDemo(true)
        return
      }

      const result = await getWeekPlanWithSlots(user.id, toLocalISODate(weekStart))
      if (!result || result.slots.length === 0) {
        setMealNames(DEMO_MEAL_NAMES)
        setIsDemo(true)
        return
      }

      setMealNames(result.slots.map(s => s.nome))
      setIsDemo(false)
    } catch {
      setMealNames(DEMO_MEAL_NAMES)
      setIsDemo(true)
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  // ── Persistence ───────────────────────────────────────────────────────────

  useEffect(() => {
    loadMeals()
  }, [loadMeals])

  // Load checked items from localStorage (per week)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(lsCheckedKey(weekStartStr))
      setChecked(new Set(raw ? (JSON.parse(raw) as string[]) : []))
    } catch {
      setChecked(new Set())
    }
  }, [weekStartStr])

  // Load price overrides from localStorage (global)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_PRICES)
      setPrices(raw ? (JSON.parse(raw) as Record<string, number>) : {})
    } catch {
      setPrices({})
    }
  }, [])

  // ── Handlers ──────────────────────────────────────────────────────────────

  function toggleItem(id: string) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      try { localStorage.setItem(lsCheckedKey(weekStartStr), JSON.stringify(Array.from(next))) } catch { /* noop */ }
      return next
    })
  }

  function startEdit(item: CatalogItem) {
    setEditingId(item.id)
    const current = prices[item.id] ?? item.weeklyPrice
    setEditValue(current.toFixed(2).replace('.', ','))
  }

  function commitEdit() {
    if (!editingId) return
    const value = parseFloat(editValue.replace(',', '.'))
    if (!isNaN(value) && value >= 0) {
      const next = { ...prices, [editingId]: value }
      setPrices(next)
      try { localStorage.setItem(LS_PRICES, JSON.stringify(next)) } catch { /* noop */ }
    }
    setEditingId(null)
  }

  function resetPrices() {
    setPrices({})
    try { localStorage.removeItem(LS_PRICES) } catch { /* noop */ }
  }

  async function copyList() {
    const text = formatListText(items, prices, checked, weekLabel)
    await navigator.clipboard.writeText(text)
    setCopyState('copied')
    setTimeout(() => setCopyState('idle'), 2500)
  }

  async function shareList() {
    const text = formatListText(items, prices, checked, weekLabel)
    if (navigator.share) {
      await navigator.share({ title: 'Lista de Compras NutriWeek', text })
    } else {
      await navigator.clipboard.writeText(window.location.href)
      setShareState('shared')
      setTimeout(() => setShareState('idle'), 2500)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const categories = (Object.keys(CATEGORY_META) as Category[]).filter(
    c => (byCategory[c]?.length ?? 0) > 0,
  )

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-10">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10">
              <ShoppingCart className="h-5 w-5 text-brand" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Lista de Compras</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500 pl-11">
            Semana de {weekLabel}
            {isDemo && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                Dados de exemplo
              </span>
            )}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={loadMeals}
            disabled={loading}
            title="Atualizar lista"
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </button>

          <button
            onClick={copyList}
            disabled={loading || items.length === 0}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all',
              copyState === 'copied'
                ? 'bg-green-500 text-white'
                : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
              (loading || items.length === 0) && 'opacity-40 cursor-not-allowed',
            )}
          >
            {copyState === 'copied'
              ? <><Check className="h-3.5 w-3.5" /> Copiado!</>
              : <><ClipboardCopy className="h-3.5 w-3.5" /> Copiar lista</>
            }
          </button>

          <button
            onClick={shareList}
            disabled={loading || items.length === 0}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all',
              shareState === 'shared'
                ? 'bg-green-500 text-white'
                : 'bg-brand text-white hover:bg-brand-600',
              (loading || items.length === 0) && 'opacity-40 cursor-not-allowed',
            )}
          >
            {shareState === 'shared'
              ? <><Check className="h-3.5 w-3.5" /> Link copiado!</>
              : <><Share2 className="h-3.5 w-3.5" /> Compartilhar</>
            }
          </button>
        </div>
      </div>

      {/* ── Summary strip ───────────────────────────────────────────────── */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total estimado', value: fmtBRL(totals.total),    color: 'text-gray-900' },
            { label: 'Já comprado',    value: fmtBRL(totals.done),     color: 'text-green-600' },
            { label: 'Restante',       value: fmtBRL(totals.pending),  color: 'text-brand'     },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
              <p className={cn('mt-1 text-lg font-bold leading-none', color)}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Loading state ────────────────────────────────────────────────── */}
      {loading && (
        <div className="space-y-4">
          {(['proteinas', 'vegetais', 'cereais'] as Category[]).map(cat => (
            <div key={cat} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 bg-gray-50/60 px-4 py-3">
                <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
              </div>
              {[1, 2, 3].map(i => <SkeletonRow key={i} />)}
            </div>
          ))}
        </div>
      )}

      {/* ── Category sections ────────────────────────────────────────────── */}
      {!loading && items.length > 0 && (
        <>
          <div className="space-y-4">
            {categories.map(category => (
              <CategorySection
                key={category}
                category={category}
                items={byCategory[category]!}
                checked={checked}
                prices={prices}
                editingId={editingId}
                editValue={editValue}
                onToggle={toggleItem}
                onEditStart={startEdit}
                onEditChange={setEditValue}
                onEditCommit={commitEdit}
              />
            ))}
          </div>

          {/* Price reset hint */}
          {Object.keys(prices).length > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-dashed border-gray-200 px-4 py-3">
              <p className="text-xs text-gray-500">
                Você editou {Object.keys(prices).length} preço(s) manualmente.
              </p>
              <button
                onClick={resetPrices}
                className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Restaurar preços padrão
              </button>
            </div>
          )}

          {/* Uncheck all */}
          {checked.size > 0 && (
            <button
              onClick={() => {
                setChecked(new Set())
                try { localStorage.removeItem(lsCheckedKey(weekStartStr)) } catch { /* noop */ }
              }}
              className="w-full rounded-xl border border-gray-200 py-2.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50"
            >
              Desmarcar todos os itens ({checked.size})
            </button>
          )}
        </>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
            <ShoppingCart className="h-8 w-8 text-gray-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">Nenhuma refeição planejada</p>
            <p className="mt-1 text-sm text-gray-500">
              Adicione refeições no calendário semanal para gerar sua lista de compras.
            </p>
          </div>
          <a
            href="/dashboard"
            className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            Ir para o calendário
          </a>
        </div>
      )}
    </div>
  )
}
