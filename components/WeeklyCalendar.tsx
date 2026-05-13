'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { PENDING_PLAN_KEY, getProfile } from '@/lib/profile'
import { getWeekPlan, saveWeekPlan } from '@/lib/store'
import type { DayPlan, MealSlot, MealType, WeekPlan } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const MEAL_ICONS: Record<MealType, string> = {
  breakfast: '☀️',
  snack:     '🍎',
  lunch:     '🍽️',
  dinner:    '🌙',
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

function fmtDay(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
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
    <div className="rounded-xl bg-[#161b22] p-5 border border-[#21262d]">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
      <p
        className={cn(
          'mt-1.5 text-xs font-medium flex items-center gap-1',
          statusOk ? 'text-emerald-400' : 'text-rose-400',
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
        'flex flex-col rounded-xl bg-[#161b22] border p-3 min-w-[150px] flex-1',
        isToday
          ? 'border-emerald-500/50 shadow-[0_0_0_1px_rgba(16,185,129,0.2)]'
          : 'border-[#21262d]',
      )}
    >
      {/* Day header */}
      <div className="mb-3">
        <p
          className={cn(
            'text-xs font-bold uppercase tracking-widest',
            isToday ? 'text-emerald-400' : 'text-slate-400',
          )}
        >
          {dayName}
          {isToday && ' · HOJE'}
        </p>
      </div>

      {/* Meal slots */}
      {MEAL_ORDER.map((mealType, i) => {
        const slot = dayPlan?.meals[mealType]
        return (
          <button
            key={mealType}
            onClick={() =>
              slot ? onEditMeal(slot, date) : onAddMeal(date, mealType)
            }
            className={cn(
              'flex items-start gap-2 py-2 text-left w-full group',
              i < 3 && 'border-b border-[#21262d]',
            )}
          >
            <span className="text-sm leading-tight mt-0.5 shrink-0">
              {MEAL_ICONS[mealType]}
            </span>
            {slot ? (
              <span className="text-sm text-slate-200 leading-tight line-clamp-2 group-hover:text-white transition-colors">
                {slot.name}
              </span>
            ) : (
              <span className="text-xs text-slate-600 group-hover:text-slate-400 transition-colors">
                Adicionar...
              </span>
            )}
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

  // Notify parent of weekStart and load plan from localStorage
  useEffect(() => {
    const s = toLocalISODate(weekStart)
    onWeekStartChange?.(s)
    setLocalPlan(getWeekPlan(s))
  }, [weekStart, onWeekStartChange])

  // Reload plan from localStorage when parent signals a change (save/delete)
  useEffect(() => {
    if (refreshKey === undefined) return
    const s = toLocalISODate(weekStart)
    setLocalPlan(getWeekPlan(s))
    setAiPlan(null)
  }, [refreshKey, weekStart])

  // Apply pending plan generated during onboarding (one-shot)
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

  // AI plan is week-specific; clear it when navigating away
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

  // Metric status computation
  const kcalGoal = profile.metas.kcal_dia || 2000
  const protGoal = profile.metas.proteina_g || 150

  const kcalDiff = metrics.avgCalories - kcalGoal
  const kcalOk   = Math.abs(kcalDiff) <= 100
  const kcalStatus = kcalOk
    ? 'Dentro da meta'
    : kcalDiff > 0
      ? `${kcalDiff} kcal acima da meta`
      : `${Math.abs(kcalDiff)} kcal abaixo da meta`

  const protPct = protGoal > 0 ? metrics.avgProtein / protGoal : 0
  const protOk  = protPct >= 0.9
  const protStatus = protOk
    ? 'Dentro da meta'
    : `${Math.round((1 - protPct) * 100)}% abaixo da meta`

  const daysOk     = metrics.plannedDays >= 7
  const daysStatus = daysOk
    ? 'Semana completa'
    : `${7 - metrics.plannedDays} ${7 - metrics.plannedDays === 1 ? 'dia em aberto' : 'dias em aberto'}`

  const weekLabel = `${fmtDay(weekStart)} a ${fmtDay(addDays(weekStart, 6))}`

  function prevWeek() { setWeekStart(d => addDays(d, -7)) }
  function nextWeek() { setWeekStart(d => addDays(d, 7))  }
  function goToday()  { setWeekStart(getMondayOf(new Date())) }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">Semana de {weekLabel}</p>
          <h1 className="text-2xl font-bold text-white">Minha semana alimentar</h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Gerar com IA */}
          {onGeneratePlan && (
            <button
              onClick={() => onGeneratePlan(toLocalISODate(weekStart))}
              className="flex items-center gap-1.5 rounded-lg border border-[#30363d] bg-[#161b22] px-3.5 py-2 text-sm font-semibold text-white hover:border-emerald-500/50 hover:text-emerald-400 transition-all"
            >
              <Sparkles className="h-4 w-4" />
              Gerar com IA
            </button>
          )}

          {/* Ver lista */}
          <Link
            href="/compras"
            className="flex items-center gap-1.5 rounded-lg border border-[#30363d] bg-[#161b22] px-3.5 py-2 text-sm font-semibold text-white hover:border-slate-500 transition-all"
          >
            <ShoppingCart className="h-4 w-4" />
            Ver lista
          </Link>

          {/* Week navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={prevWeek}
              aria-label="Semana anterior"
              className="rounded-lg p-2 text-slate-400 hover:bg-[#161b22] hover:text-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToday}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            >
              Hoje
            </button>
            <button
              onClick={nextWeek}
              aria-label="Próxima semana"
              className="rounded-lg p-2 text-slate-400 hover:bg-[#161b22] hover:text-white transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Metric cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          label="Calorias médias/dia"
          value={`${metrics.avgCalories.toLocaleString('pt-BR')} kcal`}
          status={kcalStatus}
          statusOk={kcalOk}
        />
        <MetricCard
          label="Proteína média/dia"
          value={`${metrics.avgProtein} g`}
          status={protStatus}
          statusOk={protOk}
        />
        <MetricCard
          label="Dias planejados"
          value={`${metrics.plannedDays} / 7`}
          status={daysStatus}
          statusOk={daysOk}
        />
      </div>

      {/* ── Day columns ────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <div className="flex gap-3 min-w-max">
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
