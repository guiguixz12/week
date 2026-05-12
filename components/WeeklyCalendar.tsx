'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Dumbbell,
  Flame,
  Plus,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PENDING_PLAN_KEY } from '@/lib/profile'
import type { DayPlan, MealSlot, MealType, WeekPlan } from '@/types'
import { AIGeneratorDrawer } from './AIGeneratorDrawer'

// ─── Constants ────────────────────────────────────────────────────────────────

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Café da manhã',
  snack:     'Lanche',
  lunch:     'Almoço',
  dinner:    'Jantar',
}

const MEAL_ORDER: MealType[] = ['breakfast', 'snack', 'lunch', 'dinner']

const DAY_NAMES = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

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

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string
  bg: string
  fg: string
  tooltip?: string
}

function MetricCard({ icon, label, value, bg, fg, tooltip }: MetricCardProps) {
  return (
    <div className="relative flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm group">
      <div className={cn('shrink-0 rounded-xl p-3', bg)}>
        <span className={fg}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          {label}
        </p>
        <p className="mt-0.5 text-2xl font-bold leading-none text-gray-900">{value}</p>
      </div>
      {tooltip && (
        <div className="absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 group-hover:block z-10 pointer-events-none">
          <div className="rounded-lg bg-gray-800 px-3 py-1.5 text-[11px] text-white shadow-lg whitespace-nowrap">
            {tooltip}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── SkeletonCell ─────────────────────────────────────────────────────────────

function SkeletonCell() {
  return (
    <div className="h-[92px] w-full animate-pulse rounded-lg bg-gray-100 p-2.5">
      <div className="mb-2 h-3 w-4/5 rounded bg-gray-200" />
      <div className="h-2.5 w-2/5 rounded bg-gray-200" />
      <div className="mt-3 flex gap-1">
        <div className="h-4 w-10 rounded bg-gray-200" />
        <div className="h-4 w-10 rounded bg-gray-200" />
        <div className="h-4 w-10 rounded bg-gray-200" />
      </div>
    </div>
  )
}

// ─── MealCell ─────────────────────────────────────────────────────────────────

interface MealCellProps {
  slot: MealSlot | undefined
  mealType: MealType
  isGenerating: boolean
  onAdd: () => void
  onEdit: () => void
}

function MealCell({ slot, mealType, isGenerating, onAdd, onEdit }: MealCellProps) {
  if (isGenerating) return <SkeletonCell />

  if (!slot) {
    return (
      <button
        onClick={onAdd}
        className="flex h-[92px] w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-gray-200 transition-all group hover:border-green-400 hover:bg-green-50"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-gray-200 transition-colors group-hover:border-green-400">
          <Plus className="h-3.5 w-3.5 text-gray-300 transition-colors group-hover:text-green-500" />
        </div>
        <span className="text-[11px] font-medium leading-none text-gray-300 transition-colors group-hover:text-green-500">
          {MEAL_LABELS[mealType]}
        </span>
      </button>
    )
  }

  return (
    <button
      onClick={onEdit}
      className="flex h-[92px] w-full flex-col justify-between rounded-lg border border-gray-200 bg-white p-2.5 text-left transition-all group hover:border-green-400 hover:shadow-md"
    >
      <div className="min-h-0 flex-1">
        <p className="line-clamp-2 text-xs font-semibold leading-tight text-gray-800 transition-colors group-hover:text-green-700">
          {slot.name}
        </p>
        <p className="mt-1 flex items-center gap-0.5 text-[11px] leading-none text-gray-400">
          <Flame className="h-3 w-3 shrink-0 text-orange-400" />
          <span>{slot.calories} kcal</span>
        </p>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        <MacroBadge label={`P ${slot.macros.protein}g`} bg="bg-blue-50"  fg="text-blue-600" />
        <MacroBadge label={`C ${slot.macros.carbs}g`}   bg="bg-amber-50" fg="text-amber-600" />
        <MacroBadge label={`G ${slot.macros.fat}g`}     bg="bg-rose-50"  fg="text-rose-500" />
      </div>
    </button>
  )
}

function MacroBadge({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <span className={cn('inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-bold leading-none', bg, fg)}>
      {label}
    </span>
  )
}

// ─── WeeklyCalendar ───────────────────────────────────────────────────────────

export interface WeeklyCalendarProps {
  initialWeekPlan?: WeekPlan
  onAddMeal?: (date: string, mealType: MealType) => void
  onEditMeal?: (slot: MealSlot, date: string) => void
}

export function WeeklyCalendar({ initialWeekPlan, onAddMeal, onEditMeal }: WeeklyCalendarProps) {
  const [weekStart,    setWeekStart]    = useState<Date>(() => getMondayOf(new Date()))
  const [aiPlan,       setAiPlan]       = useState<WeekPlan | null>(null)
  const [drawerOpen,   setDrawerOpen]   = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const todayStr = toLocalISODate(new Date())

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  )

  // Apply pending plan generated during onboarding (one-shot)
  useEffect(() => {
    const raw = localStorage.getItem(PENDING_PLAN_KEY)
    if (!raw) return
    try {
      const plan = JSON.parse(raw) as WeekPlan
      setAiPlan(plan)
      setWeekStart(getMondayOf(new Date()))
    } catch { /* noop */ } finally {
      localStorage.removeItem(PENDING_PLAN_KEY)
    }
  }, [])

  // AI plan is week-specific; clear it when navigating away
  useEffect(() => { setAiPlan(null) }, [weekStart])

  const weekPlan = useMemo(
    () => aiPlan ?? initialWeekPlan ?? buildSamplePlan(weekStart),
    [aiPlan, initialWeekPlan, weekStart],
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
    const totalCost   = allSlots.reduce((s, m) => s + (m.cost ?? 0), 0)
    return {
      avgCalories: plannedDays > 0 ? Math.round(totalCals / plannedDays) : 0,
      avgProtein:  plannedDays > 0 ? Math.round(totalProt / plannedDays) : 0,
      plannedDays,
      totalCost,
    }
  }, [weekPlan])

  const weekLabel = `${fmtDay(weekStart)} – ${fmtDay(addDays(weekStart, 6))}/${weekDays[6].getFullYear()}`

  function prevWeek() { setWeekStart(d => addDays(d, -7)) }
  function nextWeek() { setWeekStart(d => addDays(d, 7))  }
  function goToday()  { setWeekStart(getMondayOf(new Date())) }

  return (
    <>
      <div className="flex flex-col gap-6">

        {/* ── Metric cards ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard
            icon={<Flame className="h-5 w-5" />}
            label="Calorias médias"
            value={`${metrics.avgCalories.toLocaleString('pt-BR')} kcal`}
            bg="bg-orange-100" fg="text-orange-500"
            tooltip={`Média dos ${metrics.plannedDays} dias com refeições planejadas`}
          />
          <MetricCard
            icon={<Dumbbell className="h-5 w-5" />}
            label="Proteína média"
            value={`${metrics.avgProtein} g`}
            bg="bg-blue-100" fg="text-blue-500"
          />
          <MetricCard
            icon={<CalendarCheck className="h-5 w-5" />}
            label="Dias planejados"
            value={`${metrics.plannedDays} / 7`}
            bg="bg-green-100" fg="text-green-600"
          />
          <MetricCard
            icon={<DollarSign className="h-5 w-5" />}
            label="Custo estimado"
            value={`R$ ${metrics.totalCost.toFixed(2).replace('.', ',')}`}
            bg="bg-purple-100" fg="text-purple-600"
          />
        </div>

        {/* ── Calendar card ──────────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

          {/* Navigation header */}
          <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
            {/* Title */}
            <div className="flex-1">
              <h2 className="text-base font-bold text-gray-900">Planejamento Semanal</h2>
              <p className="mt-0.5 text-xs text-gray-400">{weekLabel}</p>
            </div>

            {/* AI generate button */}
            <button
              onClick={() => setDrawerOpen(true)}
              disabled={isGenerating}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all',
                aiPlan
                  ? 'bg-brand text-white hover:bg-brand-600'
                  : 'border border-brand/30 bg-brand/5 text-brand hover:bg-brand/10',
                isGenerating && 'cursor-not-allowed opacity-60',
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isGenerating ? 'Gerando…' : aiPlan ? 'Plano IA ativo' : 'Gerar com IA'}
            </button>

            {/* Week navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={prevWeek}
                disabled={isGenerating}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
                aria-label="Semana anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={goToday}
                disabled={isGenerating}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 transition-colors disabled:opacity-40"
              >
                Hoje
              </button>
              <button
                onClick={nextWeek}
                disabled={isGenerating}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
                aria-label="Próxima semana"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[860px]">

              {/* Day header row */}
              <div className="grid grid-cols-[128px_repeat(7,minmax(0,1fr))] border-b border-gray-100 bg-gray-50">
                <div className="px-4 py-3" />
                {weekDays.map((day, i) => {
                  const dateStr = toLocalISODate(day)
                  const isToday = dateStr === todayStr
                  return (
                    <div
                      key={dateStr}
                      className={cn(
                        'border-l border-gray-100 px-3 py-3 text-center',
                        isToday && 'bg-green-50',
                      )}
                    >
                      <p className={cn(
                        'text-[11px] font-bold uppercase tracking-widest',
                        isToday ? 'text-green-600' : 'text-gray-400',
                      )}>
                        {DAY_NAMES[i]}
                      </p>
                      <div className="mt-1 flex justify-center">
                        <span className={cn(
                          'text-sm font-bold leading-none',
                          isToday
                            ? 'flex h-7 w-7 items-center justify-center rounded-full bg-green-500 text-white'
                            : 'text-gray-700',
                        )}>
                          {day.getDate()}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Meal rows */}
              {MEAL_ORDER.map((mealType, rowIdx) => (
                <div
                  key={mealType}
                  className={cn(
                    'grid grid-cols-[128px_repeat(7,minmax(0,1fr))]',
                    rowIdx < MEAL_ORDER.length - 1 && 'border-b border-gray-100',
                  )}
                >
                  {/* Row label */}
                  <div className="flex items-center border-r border-gray-100 bg-gray-50/60 px-4 py-3">
                    <span className="text-xs font-semibold leading-tight text-gray-500">
                      {MEAL_LABELS[mealType]}
                    </span>
                  </div>

                  {/* Cells */}
                  {weekDays.map((day) => {
                    const dateStr = toLocalISODate(day)
                    const isToday = dateStr === todayStr
                    const slot = dayPlanMap[dateStr]?.meals[mealType]
                    return (
                      <div
                        key={dateStr}
                        className={cn(
                          'border-l border-gray-100 p-2',
                          isToday && 'bg-green-50/40',
                        )}
                      >
                        <MealCell
                          slot={slot}
                          mealType={mealType}
                          isGenerating={isGenerating}
                          onAdd={() => onAddMeal?.(dateStr, mealType)}
                          onEdit={() => slot && onEditMeal?.(slot, dateStr)}
                        />
                      </div>
                    )
                  })}
                </div>
              ))}

            </div>
          </div>
        </div>
      </div>

      {/* AI generator drawer */}
      <AIGeneratorDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        weekStart={weekStart}
        onPlanGenerated={plan => {
          setAiPlan(plan)
          setDrawerOpen(false)
        }}
        onGeneratingChange={setIsGenerating}
      />
    </>
  )
}
