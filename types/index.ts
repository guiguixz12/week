export type MealType = 'breakfast' | 'snack' | 'lunch' | 'dinner'

export interface MacroInfo {
  protein: number // g
  carbs: number   // g
  fat: number     // g
}

export interface MealSlot {
  id: string
  mealType: MealType
  name: string
  calories: number
  macros: MacroInfo
  cost?: number // BRL
}

export interface DayPlan {
  date: string // YYYY-MM-DD
  meals: Partial<Record<MealType, MealSlot>>
}

export interface WeekPlan {
  id: string
  userId: string
  weekStart: string // YYYY-MM-DD (always a Monday)
  days: DayPlan[]
}

export interface UserProfile {
  id: string
  email: string
  name: string
  calorieGoal: number
  proteinGoal: number
  carbsGoal: number
  fatGoal: number
}
