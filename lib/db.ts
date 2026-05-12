/**
 * db.ts — typed data-access helpers built on top of the Supabase client.
 * All functions throw on error; callers should handle with try/catch.
 */

import { supabase } from './supabase'
import type {
  MealSlotInsert,
  MealSlotRow,
  MealSlotUpdate,
  RecipeInsert,
  RecipeRow,
  RecipeUpdate,
  UserRow,
  UserUpdate,
  WeeklyPlanRow,
} from '@/types/database'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function raise(context: string, error: { message: string }): never {
  throw new Error(`[db/${context}] ${error.message}`)
}

// ─── Users ────────────────────────────────────────────────────────────────────

/** Retorna o perfil do usuário ou null se ainda não existir. */
export async function getUserProfile(userId: string): Promise<UserRow | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) raise('getUserProfile', error)
  return data
}

/** Atualiza campos do perfil. O trigger no DB cuida do updated_at. */
export async function updateUserProfile(
  userId: string,
  updates: UserUpdate,
): Promise<UserRow> {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) raise('updateUserProfile', error)
  return data
}

// ─── Weekly plans ─────────────────────────────────────────────────────────────

/**
 * Retorna o plano da semana ou cria um novo se não existir.
 * @param semanaInicio data ISO da segunda-feira da semana (YYYY-MM-DD)
 */
export async function getOrCreateWeekPlan(
  userId: string,
  semanaInicio: string,
): Promise<WeeklyPlanRow> {
  // upsert: se já existe retorna o mesmo; a constraint UNIQUE (user_id, semana_inicio) garante idempotência
  const { data, error } = await supabase
    .from('weekly_plans')
    .upsert(
      { user_id: userId, semana_inicio: semanaInicio },
      { onConflict: 'user_id,semana_inicio', ignoreDuplicates: false },
    )
    .select()
    .single()

  if (error) raise('getOrCreateWeekPlan', error)
  return data
}

/**
 * Retorna o plano + todos os meal_slots da semana.
 * Retorna null se nenhum plano existir para essa semana.
 */
export async function getWeekPlanWithSlots(
  userId: string,
  semanaInicio: string,
): Promise<{ plan: WeeklyPlanRow; slots: MealSlotRow[] } | null> {
  const { data: plan, error: planErr } = await supabase
    .from('weekly_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('semana_inicio', semanaInicio)
    .maybeSingle()

  if (planErr) raise('getWeekPlanWithSlots/plan', planErr)
  if (!plan) return null

  const { data: slots, error: slotsErr } = await supabase
    .from('meal_slots')
    .select('*')
    .eq('plan_id', plan.id)
    .order('dia_semana')
    .order('tipo_refeicao')

  if (slotsErr) raise('getWeekPlanWithSlots/slots', slotsErr)
  return { plan, slots: slots ?? [] }
}

// ─── Meal slots ───────────────────────────────────────────────────────────────

/**
 * Cria ou substitui um meal_slot. A constraint UNIQUE (plan_id, dia_semana, tipo_refeicao)
 * garante que cada célula do calendário tem no máximo um slot.
 */
export async function upsertMealSlot(slot: MealSlotInsert): Promise<MealSlotRow> {
  const { data, error } = await supabase
    .from('meal_slots')
    .upsert(slot, { onConflict: 'plan_id,dia_semana,tipo_refeicao' })
    .select()
    .single()

  if (error) raise('upsertMealSlot', error)
  return data
}

/** Atualiza campos de um slot existente. */
export async function updateMealSlot(
  slotId: string,
  updates: MealSlotUpdate,
): Promise<MealSlotRow> {
  const { data, error } = await supabase
    .from('meal_slots')
    .update(updates)
    .eq('id', slotId)
    .select()
    .single()

  if (error) raise('updateMealSlot', error)
  return data
}

/** Remove um meal_slot pelo id. */
export async function deleteMealSlot(slotId: string): Promise<void> {
  const { error } = await supabase
    .from('meal_slots')
    .delete()
    .eq('id', slotId)

  if (error) raise('deleteMealSlot', error)
}

// ─── Recipes ──────────────────────────────────────────────────────────────────

/** Lista todas as receitas do usuário, ordenadas por nome. */
export async function getRecipes(userId: string): Promise<RecipeRow[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('user_id', userId)
    .order('nome')

  if (error) raise('getRecipes', error)
  return data ?? []
}

/** Retorna uma única receita pelo id. */
export async function getRecipeById(recipeId: string): Promise<RecipeRow | null> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', recipeId)
    .maybeSingle()

  if (error) raise('getRecipeById', error)
  return data
}

/** Cria uma nova receita. */
export async function createRecipe(recipe: RecipeInsert): Promise<RecipeRow> {
  const { data, error } = await supabase
    .from('recipes')
    .insert(recipe)
    .select()
    .single()

  if (error) raise('createRecipe', error)
  return data
}

/** Atualiza uma receita existente. */
export async function updateRecipe(
  recipeId: string,
  updates: RecipeUpdate,
): Promise<RecipeRow> {
  const { data, error } = await supabase
    .from('recipes')
    .update(updates)
    .eq('id', recipeId)
    .select()
    .single()

  if (error) raise('updateRecipe', error)
  return data
}

/** Remove uma receita pelo id. */
export async function deleteRecipe(recipeId: string): Promise<void> {
  const { error } = await supabase
    .from('recipes')
    .delete()
    .eq('id', recipeId)

  if (error) raise('deleteRecipe', error)
}
