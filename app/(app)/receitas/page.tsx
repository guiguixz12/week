'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChefHat, Clock, Flame, Plus, Search, Trash2, X,
  Dumbbell, Wheat, Droplets, BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import {
  getRecipes, saveRecipe, updateRecipe, deleteRecipe,
  type Recipe, type RecipeIngredient, type MealTag,
} from '@/lib/store'

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_TAGS: MealTag[] = [
  'Café da manhã', 'Lanche', 'Almoço', 'Jantar',
  'Low carb', 'Vegetariano', 'Vegano', 'Sem glúten', 'Sem lactose', 'High protein', 'Cetogênico',
]

const MEAL_TAGS: MealTag[] = ['Café da manhã', 'Lanche', 'Almoço', 'Jantar']

const EMOJIS = ['🥗', '🍳', '🥩', '🥕', '🍚', '🥑', '🫙', '🥣', '🍲', '🍱', '🥝', '🐟', '🍗', '🥦', '🥜', '🍠', '🥚', '🧀']

const EMPTY_RECIPE: Omit<Recipe, 'id' | 'created_at'> = {
  nome: '',
  emoji: '🥗',
  calorias: 0,
  proteina: 0,
  carbs: 0,
  gordura: 0,
  tempo_preparo: 30,
  porcoes: 2,
  ingredientes: [{ nome: '', quantidade: '' }],
  modo_preparo: '',
  tags: [],
}

// ─── RecipeCard ───────────────────────────────────────────────────────────────

function MacroPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', color)}>
      {label} {value}g
    </span>
  )
}

interface RecipeCardProps {
  recipe: Recipe
  onEdit: () => void
  onDelete: () => void
}

function RecipeCard({ recipe, onEdit, onDelete }: RecipeCardProps) {
  const [confirmDel, setConfirmDel] = useState(false)

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirmDel) { setConfirmDel(true); return }
    deleteRecipe(recipe.id)
    onDelete()
    toast('Receita removida', 'success')
  }

  return (
    <div
      onClick={onEdit}
      className="group relative flex cursor-pointer flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-brand/40 hover:shadow-md"
    >
      {/* Delete button */}
      <button
        onClick={handleDelete}
        className={cn(
          'absolute right-3 top-3 rounded-lg p-1.5 text-xs font-semibold transition-all opacity-0 group-hover:opacity-100',
          confirmDel
            ? 'bg-red-100 text-red-700 opacity-100'
            : 'bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500',
        )}
        title={confirmDel ? 'Clique para confirmar' : 'Remover'}
      >
        {confirmDel ? 'Confirmar?' : <Trash2 className="h-3.5 w-3.5" />}
      </button>

      {/* Emoji + name */}
      <div className="mb-3 flex items-start gap-3">
        <span className="text-3xl leading-none">{recipe.emoji}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 leading-tight line-clamp-2 pr-8">{recipe.nome}</h3>
          <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />{recipe.tempo_preparo} min
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" />{recipe.porcoes} porção{recipe.porcoes !== 1 ? 'ões' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Calories */}
      <div className="mb-3 flex items-center gap-1.5 rounded-xl bg-orange-50 px-3 py-2">
        <Flame className="h-4 w-4 text-orange-400" />
        <span className="font-bold text-orange-700">{recipe.calorias} kcal</span>
        <span className="text-xs text-orange-400">/ porção</span>
      </div>

      {/* Macros */}
      <div className="flex flex-wrap gap-1 mb-3">
        <MacroPill label="P" value={recipe.proteina} color="bg-blue-50 text-blue-700" />
        <MacroPill label="C" value={recipe.carbs}    color="bg-amber-50 text-amber-700" />
        <MacroPill label="G" value={recipe.gordura}  color="bg-rose-50 text-rose-600" />
      </div>

      {/* Tags */}
      {recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-auto">
          {recipe.tags.slice(0, 3).map(tag => (
            <span key={tag} className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand">
              {tag}
            </span>
          ))}
          {recipe.tags.length > 3 && (
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] text-gray-500">
              +{recipe.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── RecipeModal ──────────────────────────────────────────────────────────────

interface RecipeModalProps {
  recipe: Omit<Recipe, 'id' | 'created_at'> | null
  editId: string | null
  onClose: () => void
  onSaved: () => void
}

function RecipeModal({ recipe, editId, onClose, onSaved }: RecipeModalProps) {
  const [form, setForm] = useState<Omit<Recipe, 'id' | 'created_at'>>(recipe ?? EMPTY_RECIPE)
  const [showEmojis, setShowEmojis] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function setField<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function addIngredient() {
    setField('ingredientes', [...form.ingredientes, { nome: '', quantidade: '' }])
  }

  function removeIngredient(idx: number) {
    setField('ingredientes', form.ingredientes.filter((_, i) => i !== idx))
  }

  function setIngredient(idx: number, field: keyof RecipeIngredient, value: string) {
    const next = form.ingredientes.map((ing, i) =>
      i === idx ? { ...ing, [field]: value } : ing
    )
    setField('ingredientes', next)
  }

  function toggleTag(tag: MealTag) {
    setField('tags', form.tags.includes(tag) ? form.tags.filter(t => t !== tag) : [...form.tags, tag])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) { toast('Informe o nome da receita', 'error'); return }
    if (editId) {
      updateRecipe(editId, form)
      toast('Receita atualizada!', 'success')
    } else {
      saveRecipe(form)
      toast('Receita salva!', 'success')
    }
    onSaved()
  }

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">
            {editId ? 'Editar receita' : 'Nova receita'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Emoji + Name */}
          <div className="flex gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmojis(s => !s)}
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 text-2xl hover:border-brand"
              >
                {form.emoji}
              </button>
              {showEmojis && (
                <div className="absolute left-0 top-14 z-10 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                  <div className="grid grid-cols-6 gap-1">
                    {EMOJIS.map(e => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => { setField('emoji', e); setShowEmojis(false) }}
                        className="rounded-lg p-1.5 text-xl hover:bg-gray-100"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-semibold text-gray-700">Nome da receita *</label>
              <input
                value={form.nome}
                onChange={e => setField('nome', e.target.value)}
                placeholder="Ex: Frango grelhado com legumes"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </div>

          {/* Macros grid */}
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-700">Informações nutricionais (por porção)</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  { key: 'calorias', label: 'Calorias', suffix: 'kcal', icon: <Flame className="h-3.5 w-3.5 text-orange-400" /> },
                  { key: 'proteina', label: 'Proteína', suffix: 'g',    icon: <Dumbbell className="h-3.5 w-3.5 text-blue-500" /> },
                  { key: 'carbs',    label: 'Carbos',   suffix: 'g',    icon: <Wheat className="h-3.5 w-3.5 text-amber-500" /> },
                  { key: 'gordura',  label: 'Gordura',  suffix: 'g',    icon: <Droplets className="h-3.5 w-3.5 text-rose-400" /> },
                ] as const
              ).map(({ key, label, suffix, icon }) => (
                <div key={key}>
                  <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-gray-600">
                    {icon}{label}
                  </label>
                  <div className="flex items-center rounded-xl border border-gray-200 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                    <input
                      type="number"
                      min={0}
                      value={form[key] || ''}
                      onChange={e => setField(key, Number(e.target.value))}
                      className="w-full rounded-l-xl bg-transparent px-3 py-2 text-sm text-gray-800 focus:outline-none"
                    />
                    <span className="pr-3 text-xs text-gray-400">{suffix}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Time + servings */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Tempo de preparo (min)</label>
              <input
                type="number"
                min={1}
                value={form.tempo_preparo || ''}
                onChange={e => setField('tempo_preparo', Number(e.target.value))}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Porções</label>
              <input
                type="number"
                min={1}
                value={form.porcoes || ''}
                onChange={e => setField('porcoes', Number(e.target.value))}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-700">Tags</p>
            <div className="flex flex-wrap gap-2">
              {ALL_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-semibold transition-all',
                    form.tags.includes(tag)
                      ? 'border-brand bg-brand text-white'
                      : 'border-gray-200 text-gray-600 hover:border-brand hover:text-brand',
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Ingredients */}
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-700">Ingredientes</p>
            <div className="space-y-2">
              {form.ingredientes.map((ing, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    value={ing.nome}
                    onChange={e => setIngredient(idx, 'nome', e.target.value)}
                    placeholder="Ingrediente"
                    className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                  />
                  <input
                    value={ing.quantidade}
                    onChange={e => setIngredient(idx, 'quantidade', e.target.value)}
                    placeholder="Qtd (ex: 100g)"
                    className="w-28 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeIngredient(idx)}
                    disabled={form.ingredientes.length === 1}
                    className="rounded-xl p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addIngredient}
              className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
            >
              <Plus className="h-4 w-4" /> Adicionar ingrediente
            </button>
          </div>

          {/* Preparation mode */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Modo de preparo</label>
            <textarea
              value={form.modo_preparo}
              onChange={e => setField('modo_preparo', e.target.value)}
              placeholder="Descreva os passos do preparo..."
              rows={4}
              className="w-full resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex shrink-0 justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            {editId ? 'Salvar alterações' : 'Salvar receita'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReceitasPage() {
  const [recipes, setRecipes]       = useState<Recipe[]>([])
  const [search, setSearch]         = useState('')
  const [filterTag, setFilterTag]   = useState<MealTag | ''>('')
  const [modalOpen, setModalOpen]   = useState(false)
  const [editRecipe, setEditRecipe] = useState<Recipe | null>(null)

  function reload() { setRecipes(getRecipes()) }

  useEffect(() => { reload() }, [])

  const filtered = useMemo(() => {
    let list = recipes
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r => r.nome.toLowerCase().includes(q) || r.tags.some(t => t.toLowerCase().includes(q)))
    }
    if (filterTag) {
      list = list.filter(r => r.tags.includes(filterTag))
    }
    return list
  }, [recipes, search, filterTag])

  function openNew() {
    setEditRecipe(null)
    setModalOpen(true)
  }

  function openEdit(r: Recipe) {
    setEditRecipe(r)
    setModalOpen(true)
  }

  function handleSaved() {
    setModalOpen(false)
    reload()
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Minhas Receitas</h2>
          <p className="text-sm text-gray-500">{recipes.length} receita{recipes.length !== 1 ? 's' : ''} salva{recipes.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nova receita
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar receitas..."
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterTag('')}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
              filterTag === '' ? 'border-brand bg-brand text-white' : 'border-gray-200 text-gray-600 hover:border-brand',
            )}
          >
            Todos
          </button>
          {MEAL_TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => setFilterTag(filterTag === tag ? '' : tag)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
                filterTag === tag ? 'border-brand bg-brand text-white' : 'border-gray-200 text-gray-600 hover:border-brand',
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Grid or empty state */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-20">
          <ChefHat className="mb-4 h-12 w-12 text-gray-300" />
          <p className="text-lg font-semibold text-gray-400">
            {recipes.length === 0 ? 'Nenhuma receita ainda' : 'Nenhuma receita encontrada'}
          </p>
          <p className="mt-1 text-sm text-gray-400">
            {recipes.length === 0
              ? 'Clique em "Nova receita" para começar'
              : 'Tente ajustar o filtro ou busca'}
          </p>
          {recipes.length === 0 && (
            <button
              onClick={openNew}
              className="mt-5 flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
            >
              <Plus className="h-4 w-4" /> Nova receita
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(r => (
            <RecipeCard
              key={r.id}
              recipe={r}
              onEdit={() => openEdit(r)}
              onDelete={reload}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <RecipeModal
          recipe={editRecipe}
          editId={editRecipe?.id ?? null}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
