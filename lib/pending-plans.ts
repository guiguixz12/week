import type { WeekPlan, MealType, MealSlot } from '@/types'

// ─── In-memory pending plan store ────────────────────────────────────────────
// Works in standalone Next.js (single persistent Node.js process)

interface PendingEntry {
  plan: WeekPlan
  expiresAt: number
}

const store = new Map<string, PendingEntry>()

export function storePendingPlan(userId: string, plan: WeekPlan): void {
  store.set(userId, { plan, expiresAt: Date.now() + 15 * 60 * 1000 }) // 15 min TTL
}

export function getPendingPlan(userId: string): WeekPlan | null {
  const entry = store.get(userId)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    store.delete(userId)
    return null
  }
  store.delete(userId) // one-time read
  return entry.plan
}

export function hasPendingPlan(userId: string): boolean {
  const entry = store.get(userId)
  if (!entry) return false
  if (Date.now() > entry.expiresAt) {
    store.delete(userId)
    return false
  }
  return true
}

// ─── Format conversion: "dias" format → WeekPlan ────────────────────────────

interface MealAPI {
  nome: string
  calorias: number
  proteina: number
  carbs: number
  gordura: number
}

interface DiaAPI {
  dia?: string
  cafe_da_manha?: MealAPI
  lanche?: MealAPI
  almoco?: MealAPI
  jantar?: MealAPI
}

function isoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function diasToWeekPlan(
  userId: string,
  weekStart: string,
  dias: DiaAPI[],
): WeekPlan {
  const mealKeys: Array<{ key: keyof DiaAPI; mealType: MealType }> = [
    { key: 'cafe_da_manha', mealType: 'breakfast' },
    { key: 'lanche',        mealType: 'snack'     },
    { key: 'almoco',        mealType: 'lunch'     },
    { key: 'jantar',        mealType: 'dinner'    },
  ]

  const base = new Date(`${weekStart}T12:00:00`)

  const days = dias.slice(0, 7).map((dia, i) => {
    const d = new Date(base)
    d.setDate(d.getDate() + i)
    const date = isoDate(d)

    const meals: Partial<Record<MealType, MealSlot>> = {}
    for (const { key, mealType } of mealKeys) {
      const m = dia[key] as MealAPI | undefined
      if (m?.nome) {
        meals[mealType] = {
          id: `${date}-${mealType}`,
          mealType,
          name:     m.nome,
          calories: m.calorias ?? 0,
          macros:   { protein: m.proteina ?? 0, carbs: m.carbs ?? 0, fat: m.gordura ?? 0 },
        }
      }
    }

    return { date, meals }
  })

  return {
    id:        `n8n-${weekStart}`,
    userId,
    weekStart,
    days,
  }
}
