'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Apple,
  ChevronLeft,
  ChevronRight,
  Moon,
  ShoppingCart,
  Sparkles,
  Sun,
  UtensilsCrossed,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { PENDING_PLAN_KEY, getProfile } from '@/lib/profile'
import { getWeekPlan, saveWeekPlan } from '@/lib/store'
import type { DayPlan, MealSlot, MealType, WeekPlan } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const MEAL_ICONS: Record<MealType, React.ElementType> = {
  breakfast: Sun,
  snack:     Apple,
  lunch:     UtensilsCrossed,
  dinner:    Moon,
}

const MEAL_ORDER: MealType[] = ['breakfast', 'snack', 'lunch', 'dinner']

const DAY_NAMES_SHORT = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM']

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getMondayOf(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toLocalISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function fmtWeekLabel(start: Date, end: Date): string {
  const startDay = start.getDate()
  const endDay   = end.getDate()
  if (start.getMonth() === end.getMonth()) {
    const month = end.toLocaleDateString('pt-BR', { month: 'long' })
    return `${startDay} a ${endDay} de ${month}`
  }
  const startMonth = start.toLocaleDateString('pt-BR', { month: 'long' })
  const endMonth   = end.toLocaleDateString('pt-BR', { month: 'long' })
  return `${startDay} de ${startMonth} a ${endDay} de ${endMonth}`
}

// ─── Demo data ────────────────────────────────────────────────────────────────

function buildSamplePlan(monday: Date): WeekPlan {
  const slot = (
    id: string,
    mealType: MealType,
    name: string,
    calories: number,
    protein: number,
    carbs: number,
    fat: number,
    cost: number,
  ): MealSlot => ({ id, mealType, name, calories, macros: { protein, carbs, fat }, cost })

  const byDate: Record<string, Partial<Record<MealType, MealSlot>>> = {
    [toLocalISODate(monday)]: {
      breakfast: slot('1', 'breakfast', 'Aveia com frutas vermelhas', 320, 12, 55, 6, 8),
      lunch:     slot('2', 'lunch',     'Frango grelhado, arroz integral e brócolis', 520, 45, 52, 10, 18),
      dinner:    slot('3', 'dinner',    'Salmão ao forno com batata-doce', 480, 38, 40, 16, 28),
    },
    [toLocalISODate(addDays(monday, 1))]: {
      breakfast: slot('4', 'breakfast', 'Omelete com espinafre', 280, 22, 6, 18, 9),
      snack:     slot('5', 'snack',     'Iogurte grego com granola', 210, 15, 28, 4, 7),
      lunch:     slot('6', 'lunch',     'Bowl de quinoa com legumes', 440, 18, 65, 12, 20),
      dinner:    slot('7', 'dinner',    'Carne moída com abobrinha', 380, 32, 15, 20, 16),
    },
    [toLocalISODate(addDays(monday, 2))]: {
      lunch: slot('8', 'lunch', 'Macarrão integral ao sugo', 490, 16, 82, 8, 12),
    },
    [toLocalISODate(addDays(monday, 3))]: {
      breakfast: slot('9',  'breakfast', 'Panqueca de banana', 350, 8, 62, 9, 6),
      snack:     slot('10', 'snack',     'Mix de castanhas', 180, 5, 8, 16, 5),
      lunch:     slot('11', 'lunch',     'Tilápia com purê de mandioca', 510, 40, 55, 10, 22),
      dinner:    slot('12', 'dinner',    'Sopa de lentilha', 290, 18, 45, 4, 10),
    },
    [toLocalISODate(addDays(monday, 4))]: {
      breakfast: slot('13', 'breakfast', 'Tapioca com queijo e tomate', 300, 14, 46, 7, 8),
      lunch:     slot('14', 'lunch',     'Peito de frango com feijão e couve', 580, 50, 60, 12, 19),
      dinner:    slot('15', 'dinner',    'Ovo mexido com torrada integral', 320, 20, 28, 16, 7),
    },
  }

  const days: DayPlan[] = Array.from({ length: 7 }, (_, i) => {
    const date = toLocalISODate(addDays(monday, i))
    return { date, meals: byDate[date] ?? {} }
  })

  return { id: 'sample', userId: 'demo', weekStart: toLocalISODate(monday), days }
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  status,
  statusOk,
}: {
  label: string
  value: string
  status: string
  statusOk: boolean
}) {
  return (
    <div className="rounded-xl bg-surface border border-surface-border p-4">
      <p className="text-xs font-medium text-[#8B949E]">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[#E6EDF3]">{value}</p>
      <p
        className={cn(
          'mt-1.5 text-xs font-medium flex items-center gap-1',
          statusOk ? 'text-[#1D9E75]' : 'text-rose-400',
        )}
      >
        {statusOk ? '✓' : '↓'} {status}
      </p>
    </div>
  )
}

// ─── DayColumn ────────────────────────────────────────────────────────────────

interface DayColumnProps {
  date: string
  dayName: string
  isToday: boolean
  dayPlan: DayPlan | undefined
  onAddMeal: (date: string, mealType: MealType) => void
  onEditMeal: (slot: MealSlot, date: string) => void
}

function DayColumn({ date, dayName, isToday, dayPlan, onAddMeal, onEditMeal }: DayColumnProps) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border p-3 min-w-0',
        isToday
          ? 'bg-[#1D9E75]/5 border-[#1D9E75]'
          : 'bg-surface border-surface-border',
      )}
    >
      {/* Day header */}
      <div className="mb-2">
        <p
          className={cn(
            'text-[10px] font-bold uppercase tracking-wider',
            isToday ? 'text-[#1D9E75]' : 'text-[#8B949E]',
          )}
        >
          {dayName}
          {isToday && ' · HOJE'}
        </p>
      </div>

      {/* Meal slots */}
      {MEAL_ORDER.map((mealType, i) => {
        const slot = dayPlan?.meals[mealType]
        const Icon = MEAL_ICONS[mealType]

        if (!slot) {
          return (
            <button
              key={mealType}
              onClick={() => onAddMeal(date, mealType)}
              className={cn(
                'flex items-start gap-1.5 py-1.5 text-left w-full opacity-40 hover:opacity-70 transition-opacity',
                i < 3 && 'border-b border-surface-border',
              )}
            >
              <Icon className="h-3.5 w-3.5 text-[#8B949E] shrink-0 mt-0.5" />
              <span className="text-xs text-[#8B949E] italic truncate">Adicionar...</span>
            </button>
          )
        }

        return (
          <button
            key={mealType}
            onClick={() => onEditMeal(slot, date)}
            className={cn(
              'flex items-start gap-1.5 py-1.5 text-left w-full group',
              i < 3 && 'border-b border-surface-border',
            )}
          >
            <Icon className="h-3.5 w-3.5 text-[#8B949E] shrink-0 mt-0.5" />
            <span className="text-xs text-[#E6EDF3] leading-tight line-clamp-2 group-hover:text-white transition-colors">
              {slot.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─── WeeklyCalendar ───────────────────────────────────────────────────────────

export interface WeeklyCalendarProps {
  initialWeekPlan?: WeekPlan
  onAddMeal?: (date: string, mealType: MealType) => void
  onEditMeal?: (slot: MealSlot, date: string) => void
  onWeekStartChange?: (weekStart: string) => void
  onGeneratePlan?: (weekStart: string) => void
  refreshKey?: number
}

export function WeeklyCalendar({
  initialWeekPlan,
  onAddMeal,
  onEditMeal,
  onWeekStartChange,
  onGeneratePlan,
  refreshKey,
}: WeeklyCalendarProps) {
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOf(new Date()))
  const [aiPlan,    setAiPlan]    = useState<WeekPlan | null>(null)
  const [localPlan, setLocalPlan] = useState<WeekPlan | null>(null)

  const profile  = useMemo(() => getProfile(), [])
  const todayStr = toLocalISODate(new Date())

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  )

  useEffect(() => {
    const s = toLocalISODate(weekStart)
    onWeekStartChange?.(s)
    setLocalPlan(getWeekPlan(s))
  }, [weekStart, onWeekStartChange])

  useEffect(() => {
    if (refreshKey === undefined) return
    const s = toLocalISODate(weekStart)
    setLocalPlan(getWeekPlan(s))
    setAiPlan(null)
  }, [refreshKey, weekStart])

  useEffect(() => {
    const raw = localStorage.getItem(PENDING_PLAN_KEY)
    if (!raw) return
    try {
      const plan = JSON.parse(raw) as WeekPlan
      saveWeekPlan(plan)
      setAiPlan(plan)
      setLocalPlan(plan)
      setWeekStart(getMondayOf(new Date()))
    } catch { /* noop */ } finally {
      localStorage.removeItem(PENDING_PLAN_KEY)
    }
  }, [])

  useEffect(() => { setAiPlan(null) }, [weekStart])

  const weekPlan = useMemo(
    () => aiPlan ?? localPlan ?? initialWeekPlan ?? buildSamplePlan(weekStart),
    [aiPlan, localPlan, initialWeekPlan, weekStart],
  )

  const dayPlanMap = useMemo(
    () => Object.fromEntries(weekPlan.days.map(d => [d.date, d])),
    [weekPlan],
  )

  const metrics = useMemo(() => {
    const allSlots    = weekPlan.days.flatMap(d => Object.values(d.meals) as MealSlot[])
    const plannedDays = weekPlan.days.filter(d => Object.keys(d.meals).length > 0).length
    const totalCals   = allSlots.reduce((s, m) => s + m.calories, 0)
    const totalProt   = allSlots.reduce((s, m) => s + m.macros.protein, 0)
    return {
      avgCalories: plannedDays > 0 ? Math.round(totalCals / plannedDays) : 0,
      avgProtein:  plannedDays > 0 ? Math.round(totalProt / plannedDays) : 0,
      plannedDays,
    }
  }, [weekPlan])

  const kcalGoal = profile.metas.kcal_dia || 2000
  const protGoal = profile.metas.proteina_g || 150

  const kcalDiff   = metrics.avgCalories - kcalGoal
  const kcalOk     = Math.abs(kcalDiff) <= 100
  const kcalStatus = kcalOk
    ? 'Dentro da meta'
    : kcalDiff > 0
      ? `${kcalDiff} kcal acima da meta`
      : `${Math.abs(kcalDiff)} kcal abaixo da meta`

  const protPct    = protGoal > 0 ? metrics.avgProtein / protGoal : 0
  const protOk     = protPct >= 0.9
  const protStatus = protOk
    ? 'Dentro da meta'
    : `${Math.round((1 - protPct) * 100)}% abaixo da meta`

  const daysOk     = metrics.plannedDays >= 7
  const daysStatus = daysOk
    ? 'Semana completa'
    : `${7 - metrics.plannedDays} ${7 - metrics.plannedDays === 1 ? 'dia em aberto' : 'dias em aberto'}`

  const weekEnd   = addDays(weekStart, 6)
  const weekLabel = fmtWeekLabel(weekStart, weekEnd)

  function prevWeek() { setWeekStart(d => addDays(d, -7)) }
  function nextWeek() { setWeekStart(d => addDays(d, 7))  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        {/* Left: title + week label with inline nav */}
        <div>
          <div className="flex items-center gap-1 mb-0.5">
            <button
              onClick={prevWeek}
              aria-label="Semana anterior"
              className="rounded p-0.5 text-[#8B949E] hover:text-[#E6EDF3] transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <p className="text-sm text-[#8B949E]">Semana de {weekLabel}</p>
            <button
              onClick={nextWeek}
              aria-label="Próxima semana"
              className="rounded p-0.5 text-[#8B949E] hover:text-[#E6EDF3] transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <h1 className="text-2xl font-bold text-[#E6EDF3]">Minha semana alimentar</h1>
        </div>

        {/* Right: Gerar com IA + Ver lista */}
        <div className="flex items-center gap-2">
          {onGeneratePlan && (
            <button
              onClick={() => onGeneratePlan(toLocalISODate(weekStart))}
              className="flex items-center gap-1.5 rounded-lg border border-surface-border bg-surface px-3.5 py-2 text-sm font-semibold text-[#E6EDF3] hover:border-[#1D9E75]/50 hover:text-[#1D9E75] transition-all"
            >
              <Sparkles className="h-4 w-4" />
              Gerar com IA
            </button>
          )}
          <Link
            href="/compras"
            className="flex items-center gap-1.5 rounded-lg border border-surface-border bg-surface px-3.5 py-2 text-sm font-semibold text-[#E6EDF3] hover:border-[#8B949E] transition-all"
          >
            <ShoppingCart className="h-4 w-4" />
            Ver lista
          </Link>
        </div>
      </div>

      {/* ── Metric cards — 3 cards, fluid grid ─────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          label="Calorias médias/dia"
          value={metrics.avgCalories.toLocaleString('pt-BR')}
          status={kcalStatus}
          statusOk={kcalOk}
        />
        <MetricCard
          label="Proteína média"
          value={`${metrics.avgProtein}g`}
          status={protStatus}
          statusOk={protOk}
        />
        <MetricCard
          label="Dias planejados"
          value={`${metrics.plannedDays}/7`}
          status={daysStatus}
          statusOk={daysOk}
        />
      </div>

      {/* ── Day columns — 7 cols, horizontal scroll only on small screens ───── */}
      <div className="overflow-x-auto scroll-smooth -mx-1 px-1">
        <div className="grid grid-cols-7 gap-2 min-w-[560px]">
          {weekDays.map((day, i) => {
            const dateStr = toLocalISODate(day)
            const isToday = dateStr === todayStr
            return (
              <DayColumn
                key={dateStr}
                date={dateStr}
                dayName={DAY_NAMES_SHORT[i]}
                isToday={isToday}
                dayPlan={dayPlanMap[dateStr]}
                onAddMeal={(d, m) => onAddMeal?.(d, m)}
                onEditMeal={(s, d) => onEditMeal?.(s, d)}
              />
            )
          })}
        </div>
      </div>

    </div>
  )
}
