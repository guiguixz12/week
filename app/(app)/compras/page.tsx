'use client'

export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  ClipboardCopy,
  Mail,
  MessageCircle,
  RefreshCw,
  Share2,
  ShoppingCart,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { getWeekPlan } from '@/lib/store'

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = 'proteinas' | 'vegetais' | 'laticinios' | 'cereais' | 'outros'

interface CatalogItem {
  id:       string
  name:     string
  category: Category
  qty:      string
  keywords: string[]
}

// ─── Ingredient catalog ───────────────────────────────────────────────────────

const CATALOG: CatalogItem[] = [
  // Proteínas
  { id: 'frango',      name: 'Filé de frango',       category: 'proteinas',  qty: '800g',     keywords: ['frango', 'peito de frango', 'frango grelhado', 'frango ao'] },
  { id: 'carne-moida', name: 'Carne moída',           category: 'proteinas',  qty: '500g',     keywords: ['carne moída', 'carne bovina', 'carne moi'] },
  { id: 'salmon',      name: 'Salmão',                category: 'proteinas',  qty: '400g',     keywords: ['salmão', 'salmon'] },
  { id: 'tilapia',     name: 'Tilápia',               category: 'proteinas',  qty: '500g',     keywords: ['tilápia', 'tilapia'] },
  { id: 'ovos',        name: 'Ovos',                  category: 'proteinas',  qty: '1 dúzia',  keywords: ['ovo ', 'omelete', 'ovo mexido', 'panqueca', 'ovos'] },
  { id: 'atum',        name: 'Atum em lata',           category: 'proteinas',  qty: '2 un',     keywords: ['atum em', 'atum na'] },
  { id: 'camarao',     name: 'Camarão',               category: 'proteinas',  qty: '300g',     keywords: ['camarão', 'camarao'] },
  { id: 'patinho',     name: 'Patinho bovino',         category: 'proteinas',  qty: '500g',     keywords: ['patinho', 'bife', 'alcatra'] },

  // Vegetais
  { id: 'brocolis',         name: 'Brócolis',         category: 'vegetais',   qty: '400g',     keywords: ['brócolis', 'brocolis'] },
  { id: 'couve',            name: 'Couve',            category: 'vegetais',   qty: '1 maço',   keywords: ['couve'] },
  { id: 'espinafre',        name: 'Espinafre',        category: 'vegetais',   qty: '200g',     keywords: ['espinafre'] },
  { id: 'abobrinha',        name: 'Abobrinha',        category: 'vegetais',   qty: '500g',     keywords: ['abobrinha'] },
  { id: 'cenoura',          name: 'Cenoura',          category: 'vegetais',   qty: '500g',     keywords: ['cenoura'] },
  { id: 'tomate',           name: 'Tomate',           category: 'vegetais',   qty: '500g',     keywords: ['tomate'] },
  { id: 'alface',           name: 'Alface',           category: 'vegetais',   qty: '1 pé',     keywords: ['alface', 'salada verde'] },
  { id: 'batata-doce',      name: 'Batata-doce',      category: 'vegetais',   qty: '600g',     keywords: ['batata-doce', 'batata doce'] },
  { id: 'mandioca',         name: 'Mandioca',         category: 'vegetais',   qty: '500g',     keywords: ['mandioca', 'aipim', 'macaxeira'] },
  { id: 'frutas-vermelhas', name: 'Frutas vermelhas', category: 'vegetais',   qty: '300g',     keywords: ['frutas vermelhas', 'morango', 'mirtilo'] },
  { id: 'banana',           name: 'Banana',           category: 'vegetais',   qty: '6 un',     keywords: ['banana'] },
  { id: 'maca',             name: 'Maçã',             category: 'vegetais',   qty: '4 un',     keywords: ['maçã', 'maca '] },
  { id: 'pepino',           name: 'Pepino',           category: 'vegetais',   qty: '2 un',     keywords: ['pepino'] },
  { id: 'beterraba',        name: 'Beterraba',        category: 'vegetais',   qty: '3 un',     keywords: ['beterraba'] },

  // Laticínios
  { id: 'iogurte-grego',  name: 'Iogurte grego',          category: 'laticinios', qty: '2 un',  keywords: ['iogurte grego', 'iogurte natural'] },
  { id: 'queijo-minas',   name: 'Queijo minas frescal',    category: 'laticinios', qty: '400g',  keywords: ['queijo minas', 'queijo frescal', 'queijo e ', 'queijo,'] },
  { id: 'queijo-cottage', name: 'Queijo cottage',          category: 'laticinios', qty: '200g',  keywords: ['queijo cottage', 'cottage'] },
  { id: 'leite',          name: 'Leite',                   category: 'laticinios', qty: '1L',    keywords: ['leite'] },
  { id: 'manteiga',       name: 'Manteiga',                category: 'laticinios', qty: '200g',  keywords: ['manteiga'] },
  { id: 'requeijao',      name: 'Requeijão',               category: 'laticinios', qty: '200g',  keywords: ['requeijão', 'requeijao'] },

  // Cereais
  { id: 'arroz-integral',    name: 'Arroz integral',      category: 'cereais', qty: '1kg',   keywords: ['arroz integral', 'arroz'] },
  { id: 'feijao',            name: 'Feijão',              category: 'cereais', qty: '500g',  keywords: ['feijão', 'feijao'] },
  { id: 'quinoa',            name: 'Quinoa',              category: 'cereais', qty: '400g',  keywords: ['quinoa'] },
  { id: 'aveia',             name: 'Aveia em flocos',     category: 'cereais', qty: '500g',  keywords: ['aveia'] },
  { id: 'granola',           name: 'Granola',             category: 'cereais', qty: '300g',  keywords: ['granola'] },
  { id: 'macarrao-integral', name: 'Macarrão integral',   category: 'cereais', qty: '500g',  keywords: ['macarrão integral', 'macarrao integral'] },
  { id: 'tapioca',           name: 'Goma de tapioca',     category: 'cereais', qty: '500g',  keywords: ['tapioca'] },
  { id: 'pao-integral',      name: 'Pão integral',        category: 'cereais', qty: '1 un',  keywords: ['pão integral', 'torrada integral', 'torrada'] },
  { id: 'lentilha',          name: 'Lentilha',            category: 'cereais', qty: '500g',  keywords: ['lentilha'] },
  { id: 'grao-de-bico',      name: 'Grão-de-bico',        category: 'cereais', qty: '400g',  keywords: ['grão-de-bico', 'grao-de-bico', 'grao de bico'] },

  // Outros
  { id: 'azeite',        name: 'Azeite de oliva',   category: 'outros', qty: '500ml',    keywords: ['azeite'] },
  { id: 'mel',           name: 'Mel',               category: 'outros', qty: '300g',     keywords: ['mel '] },
  { id: 'castanhas',     name: 'Mix de castanhas',  category: 'outros', qty: '200g',     keywords: ['castanhas', 'mix de castanhas'] },
  { id: 'molho-tomate',  name: 'Molho de tomate',   category: 'outros', qty: '2 un',     keywords: ['sugo', 'molho de tomate', 'ao sugo'] },
  { id: 'limao',         name: 'Limão',             category: 'outros', qty: '6 un',     keywords: ['limão', 'limao'] },
  { id: 'alho',          name: 'Alho',              category: 'outros', qty: '1 cabeça', keywords: [' alho'] },
  { id: 'cebola',        name: 'Cebola',            category: 'outros', qty: '500g',     keywords: ['cebola'] },
  { id: 'caldo-legumes', name: 'Caldo de legumes',  category: 'outros', qty: '2 un',     keywords: ['sopa de', 'caldo de legumes'] },
  { id: 'oleo-coco',     name: 'Óleo de coco',      category: 'outros', qty: '200ml',    keywords: ['óleo de coco', 'oleo de coco'] },
]

const CATEGORY_META: Record<Category, { label: string; emoji: string; order: number }> = {
  proteinas:  { label: 'Proteínas',  emoji: '🥩', order: 0 },
  vegetais:   { label: 'Vegetais',   emoji: '🥦', order: 1 },
  laticinios: { label: 'Laticínios', emoji: '🥛', order: 2 },
  cereais:    { label: 'Cereais',    emoji: '🌾', order: 3 },
  outros:     { label: 'Outros',     emoji: '🏪', order: 4 },
}

// ─── Demo meals ───────────────────────────────────────────────────────────────

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

// ─── Shopping list builder ────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function generateList(mealNames: string[]): CatalogItem[] {
  const combined = ' ' + mealNames.map(n => normalize(n)).join(' ') + ' '
  const found = new Set<string>()
  const result: CatalogItem[] = []
  for (const item of CATALOG) {
    for (const kw of item.keywords) {
      if (combined.includes(normalize(kw))) {
        if (!found.has(item.id)) { found.add(item.id); result.push(item) }
        break
      }
    }
  }
  return result
}

function groupByCategory(items: CatalogItem[]): Partial<Record<Category, CatalogItem[]>> {
  const groups: Partial<Record<Category, CatalogItem[]>> = {}
  for (const item of items) { (groups[item.category] ??= []).push(item) }
  return groups
}

function formatListText(items: CatalogItem[], checked: Set<string>, weekLabel: string): string {
  const lines: string[] = [`LISTA DE COMPRAS — ${weekLabel}`, '']
  const byCategory = groupByCategory(items)
  for (const category of Object.keys(CATEGORY_META) as Category[]) {
    const group = byCategory[category] ?? []
    if (group.length === 0) continue
    lines.push(CATEGORY_META[category].label.toUpperCase())
    for (const item of group) {
      const mark = checked.has(item.id) ? '✓' : '☐'
      lines.push(`${mark} ${item.name} — ${item.qty}`)
    }
    lines.push('')
  }
  lines.push('Gerado pelo NutriWeek')
  return lines.join('\n')
}

// ─── localStorage ─────────────────────────────────────────────────────────────

function lsCheckedKey(weekStart: string) { return `nutriweek:shopping:checked:${weekStart}` }

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="h-5 w-5 rounded bg-gray-200 shrink-0" />
      <div className="flex-1 h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-4 w-12 bg-gray-200 rounded" />
    </div>
  )
}

interface ItemRowProps {
  item:     CatalogItem
  checked:  boolean
  onToggle: () => void
}

function ItemRow({ item, checked, onToggle }: ItemRowProps) {
  return (
    <div className={cn('flex items-center gap-3 px-4 py-3 transition-colors', checked ? 'bg-gray-50' : 'hover:bg-gray-50/60')}>
      <button
        onClick={onToggle}
        aria-label={checked ? 'Desmarcar' : 'Marcar como comprado'}
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all',
          checked ? 'border-brand bg-brand text-white' : 'border-gray-300 hover:border-brand',
        )}
      >
        {checked && <Check className="h-3 w-3" strokeWidth={3} />}
      </button>
      <span className={cn('flex-1 text-sm font-medium leading-tight', checked ? 'text-gray-400 line-through' : 'text-gray-800')}>
        {item.name}
      </span>
      <span className="text-xs text-gray-400">{item.qty}</span>
    </div>
  )
}

interface CategorySectionProps {
  category: Category
  items:    CatalogItem[]
  checked:  Set<string>
  onToggle: (id: string) => void
}

function CategorySection({ category, items, checked, onToggle }: CategorySectionProps) {
  const meta      = CATEGORY_META[category]
  const doneCount = items.filter(i => checked.has(i.id)).length

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/60 px-4 py-3">
        <span className="text-base">{meta.emoji}</span>
        <h3 className="text-sm font-bold text-gray-800">{meta.label}</h3>
        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-600">{items.length}</span>
        {doneCount > 0 && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">{doneCount} ✓</span>
        )}
      </div>
      <div className="divide-y divide-gray-50">
        {items.map(item => (
          <ItemRow key={item.id} item={item} checked={checked.has(item.id)} onToggle={() => onToggle(item.id)} />
        ))}
      </div>
    </div>
  )
}

// ─── ShareModal ───────────────────────────────────────────────────────────────

function ShareModal({ text, weekLabel, onClose }: { text: string; weekLabel: string; onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function copyText() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast('Lista copiada!', 'success')
    setTimeout(() => setCopied(false), 2500)
  }

  function shareWhatsApp() {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text.slice(0, 1500))}`, '_blank')
    onClose()
  }

  function shareEmail() {
    const subject = encodeURIComponent(`Lista de Compras NutriWeek — ${weekLabel}`)
    window.location.href = `mailto:?subject=${subject}&body=${encodeURIComponent(text)}`
    onClose()
  }

  return (
    <div ref={overlayRef} onClick={e => { if (e.target === overlayRef.current) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="font-bold text-gray-900">Compartilhar lista</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-2.5 p-5">
          <button onClick={shareWhatsApp}
            className="flex w-full items-center gap-3 rounded-xl border border-gray-200 px-4 py-3.5 text-left text-sm font-semibold text-gray-800 hover:border-green-400 hover:bg-green-50 transition-all">
            <MessageCircle className="h-5 w-5 text-green-500" /> Compartilhar via WhatsApp
          </button>
          <button onClick={shareEmail}
            className="flex w-full items-center gap-3 rounded-xl border border-gray-200 px-4 py-3.5 text-left text-sm font-semibold text-gray-800 hover:border-blue-400 hover:bg-blue-50 transition-all">
            <Mail className="h-5 w-5 text-blue-500" /> Enviar por Email
          </button>
          <button onClick={copyText}
            className={cn('flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-semibold transition-all',
              copied ? 'border-brand bg-brand text-white' : 'border-gray-200 text-gray-800 hover:border-brand hover:bg-brand/5')}>
            {copied ? <Check className="h-5 w-5" /> : <ClipboardCopy className="h-5 w-5 text-gray-400" />}
            {copied ? 'Copiado!' : 'Copiar texto da lista'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ComprasPage() {
  const [mealNames,      setMealNames]      = useState<string[]>([])
  const [isDemo,         setIsDemo]         = useState(false)
  const [loading,        setLoading]        = useState(true)
  const [weekStart]                         = useState<Date>(() => getMondayOf(new Date()))
  const [checked,        setChecked]        = useState<Set<string>>(new Set())
  const [copyState,      setCopyState]      = useState<'idle' | 'copied'>('idle')
  const [shareModalOpen, setShareModalOpen] = useState(false)

  const items      = useMemo(() => generateList(mealNames), [mealNames])
  const byCategory = useMemo(() => groupByCategory(items), [items])

  const weekLabel    = useMemo(() => { const e = new Date(weekStart); e.setDate(e.getDate() + 6); return `${fmtDay(weekStart)} – ${fmtDay(e)}` }, [weekStart])
  const weekStartStr = useMemo(() => toLocalISODate(weekStart), [weekStart])

  const loadMeals = useCallback((showToast = false) => {
    setLoading(true)
    try {
      const plan = getWeekPlan(toLocalISODate(weekStart))
      if (plan) {
        const names = plan.days.flatMap(d => Object.values(d.meals)).filter(Boolean).map(m => m!.name)
        if (names.length > 0) {
          setMealNames(names); setIsDemo(false)
          if (showToast) toast('Lista atualizada', 'success')
          return
        }
      }
      setMealNames(DEMO_MEAL_NAMES); setIsDemo(true)
      if (showToast) toast('Lista atualizada', 'success')
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  useEffect(() => { loadMeals() }, [loadMeals])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(lsCheckedKey(weekStartStr))
      setChecked(new Set(raw ? (JSON.parse(raw) as string[]) : []))
    } catch { setChecked(new Set()) }
  }, [weekStartStr])

  function toggleItem(id: string) {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      try { localStorage.setItem(lsCheckedKey(weekStartStr), JSON.stringify(Array.from(next))) } catch { /* noop */ }
      return next
    })
  }

  async function copyList() {
    const text = formatListText(items, checked, weekLabel)
    await navigator.clipboard.writeText(text)
    setCopyState('copied')
    toast('Lista copiada!', 'success')
    setTimeout(() => setCopyState('idle'), 2500)
  }

  const categories = (Object.keys(CATEGORY_META) as Category[]).filter(c => (byCategory[c]?.length ?? 0) > 0)

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-10">

      {/* Header */}
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
            {isDemo && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">Dados de exemplo</span>}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button onClick={() => loadMeals(true)} disabled={loading} title="Atualizar lista"
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </button>
          <button onClick={copyList} disabled={loading || items.length === 0}
            className={cn('flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all',
              copyState === 'copied' ? 'bg-green-500 text-white' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
              (loading || items.length === 0) && 'opacity-40 cursor-not-allowed')}>
            {copyState === 'copied' ? <><Check className="h-3.5 w-3.5" /> Copiado!</> : <><ClipboardCopy className="h-3.5 w-3.5" /> Copiar lista</>}
          </button>
          <button onClick={() => setShareModalOpen(true)} disabled={loading || items.length === 0}
            className={cn('flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all bg-brand text-white hover:bg-brand-600',
              (loading || items.length === 0) && 'opacity-40 cursor-not-allowed')}>
            <Share2 className="h-3.5 w-3.5" /> Compartilhar
          </button>
        </div>
      </div>

      {/* Progress summary */}
      {!loading && items.length > 0 && checked.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex-1">
            <div className="mb-1 flex justify-between text-xs font-semibold">
              <span className="text-gray-600">Progresso das compras</span>
              <span className="text-brand">{checked.size} / {items.length} itens</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-brand transition-all duration-300"
                style={{ width: `${Math.round((checked.size / items.length) * 100)}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
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

      {/* Category sections */}
      {!loading && items.length > 0 && (
        <>
          <div className="space-y-4">
            {categories.map(category => (
              <CategorySection key={category} category={category} items={byCategory[category]!} checked={checked} onToggle={toggleItem} />
            ))}
          </div>

          {checked.size > 0 && (
            <button onClick={() => { setChecked(new Set()); try { localStorage.removeItem(lsCheckedKey(weekStartStr)) } catch { /* noop */ } }}
              className="w-full rounded-xl border border-gray-200 py-2.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50">
              Desmarcar todos os itens ({checked.size})
            </button>
          )}
        </>
      )}

      {shareModalOpen && (
        <ShareModal text={formatListText(items, checked, weekLabel)} weekLabel={weekLabel} onClose={() => setShareModalOpen(false)} />
      )}

      {/* Empty state */}
      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
            <ShoppingCart className="h-8 w-8 text-gray-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">Nenhuma refeição planejada</p>
            <p className="mt-1 text-sm text-gray-500">Adicione refeições no calendário semanal para gerar sua lista de compras.</p>
          </div>
          <a href="/dashboard" className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors">
            Ir para o calendário
          </a>
        </div>
      )}
    </div>
  )
}
