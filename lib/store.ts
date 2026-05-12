'use client'

// ─── Types ────────────────────────────────────────────────────────────────────

export type MealTag =
  | 'Café da manhã'
  | 'Lanche'
  | 'Almoço'
  | 'Jantar'
  | 'Low carb'
  | 'Vegetariano'
  | 'Vegano'
  | 'Sem glúten'
  | 'Sem lactose'
  | 'High protein'
  | 'Cetogênico'

export interface RecipeIngredient {
  nome: string
  quantidade: string
}

export interface Recipe {
  id: string
  nome: string
  emoji: string
  calorias: number
  proteina: number
  carbs: number
  gordura: number
  tempo_preparo: number
  porcoes: number
  ingredientes: RecipeIngredient[]
  modo_preparo: string
  tags: MealTag[]
  created_at: string
}

export type ActivityLevel = 'sedentario' | 'leve' | 'moderado' | 'intenso' | 'atleta'
export type GoalType      = 'emagrecer'  | 'manter' | 'ganhar_massa'
export type Sex           = 'masculino'  | 'feminino'

export interface Goals {
  peso: number
  peso_meta: number
  altura: number
  idade: number
  sexo: Sex
  atividade: ActivityLevel
  objetivo: GoalType
  calorias_meta: number
  proteina_meta: number
  carbs_meta: number
  gordura_meta: number
}

export interface UserPreferences {
  nome: string
  email: string
  vegetariano: boolean
  vegano: boolean
  sem_gluten: boolean
  sem_lactose: boolean
  low_carb: boolean
  cetogenico: boolean
  alimentos_evitar: string
  notif_planejamento: boolean
  notif_compras: boolean
  notif_relatorio: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
}

// ─── Recipes ──────────────────────────────────────────────────────────────────

const RECIPES_KEY = 'nw_recipes'

export function getRecipes(): Recipe[] {
  return load<Recipe[]>(RECIPES_KEY, [])
}

export function saveRecipe(recipe: Omit<Recipe, 'id' | 'created_at'>): Recipe {
  const all = getRecipes()
  const newRecipe: Recipe = {
    ...recipe,
    id: Math.random().toString(36).slice(2),
    created_at: new Date().toISOString(),
  }
  save(RECIPES_KEY, [...all, newRecipe])
  return newRecipe
}

export function updateRecipe(id: string, updates: Partial<Omit<Recipe, 'id' | 'created_at'>>): Recipe | null {
  const all = getRecipes()
  const idx = all.findIndex(r => r.id === id)
  if (idx === -1) return null
  const updated = { ...all[idx], ...updates }
  all[idx] = updated
  save(RECIPES_KEY, all)
  return updated
}

export function deleteRecipe(id: string): void {
  save(RECIPES_KEY, getRecipes().filter(r => r.id !== id))
}

// ─── Goals ────────────────────────────────────────────────────────────────────

const GOALS_KEY = 'nw_goals'

const DEFAULT_GOALS: Goals = {
  peso: 0,
  peso_meta: 0,
  altura: 0,
  idade: 0,
  sexo: 'masculino',
  atividade: 'moderado',
  objetivo: 'manter',
  calorias_meta: 2000,
  proteina_meta: 150,
  carbs_meta: 250,
  gordura_meta: 65,
}

export function getGoals(): Goals {
  return load<Goals>(GOALS_KEY, DEFAULT_GOALS)
}

export function saveGoals(goals: Goals): void {
  save(GOALS_KEY, goals)
}

// ─── Preferences ──────────────────────────────────────────────────────────────

const PREFS_KEY = 'nw_preferences'

const DEFAULT_PREFS: UserPreferences = {
  nome: '',
  email: '',
  vegetariano: false,
  vegano: false,
  sem_gluten: false,
  sem_lactose: false,
  low_carb: false,
  cetogenico: false,
  alimentos_evitar: '',
  notif_planejamento: true,
  notif_compras: true,
  notif_relatorio: false,
}

export function getPreferences(): UserPreferences {
  return load<UserPreferences>(PREFS_KEY, DEFAULT_PREFS)
}

export function savePreferences(prefs: UserPreferences): void {
  save(PREFS_KEY, prefs)
}

// ─── Calorie average utility (shared to avoid divergence) ─────────────────────

export interface DayKcal { date: string; kcal: number }

/**
 * Calcula a média diária de calorias.
 * onlyWithData=true → só dias que têm pelo menos uma refeição (evita distorção de dias vazios).
 */
export function calcAvgKcal(days: DayKcal[], onlyWithData = true): number {
  const filtered = onlyWithData ? days.filter(d => d.kcal > 0) : days
  if (filtered.length === 0) return 0
  return Math.round(filtered.reduce((s, d) => s + d.kcal, 0) / filtered.length)
}
