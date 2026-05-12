'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Flame, TrendingDown, TrendingUp, Dumbbell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = 'current' | 'previous' | 'month'

interface DayData {
  dateStr: string
  label: string   // 'Seg 12' or 'Sem 1'
  calories: number
  protein: number
  carbs: number
  fat: number
}

interface Goals {
  calories: number  // kcal/day
  protein: number   // g/day
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MACRO_COLORS = {
  protein: '#3B82F6',
  carbs:   '#F59E0B',
  fat:     '#F43F5E',
} as const

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

// Demo calories per day (Mon–Sun) for 4 weeks
const DEMO_KCAL: number[][] = [
  [1842, 2105, 1620, 2380, 1958, 1234, 2280], // current week
  [1650, 1890, 2200, 1780, 2100, 1450, 2050], // previous week
  [2050, 1780, 1960, 2250, 1830, 1550, 2100], // 2 weeks ago
  [1720, 2030, 1870, 1990, 2160, 1340, 1980], // 3 weeks ago
]

const DEFAULT_GOALS: Goals = { calories: 2000, protein: 150 }

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

function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function fmtShort(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function fmtDay(date: Date): string {
  return `${DAY_LABELS[date.getDay() === 0 ? 6 : date.getDay() - 1]} ${date.getDate()}`
}

// ─── Color helpers ────────────────────────────────────────────────────────────

type Status = 'success' | 'warning' | 'danger' | 'neutral'

function calorieStatus(value: number, goal: number): Status {
  if (value === 0) return 'neutral'
  const r = value / goal
  if (r >= 0.85 && r <= 1.10) return 'success'
  if (r >= 0.70 && r <= 1.25) return 'warning'
  return 'danger'
}

function macroStatus(value: number, goal: number): Status {
  if (value === 0) return 'neutral'
  const r = value / goal
  if (r >= 0.80 && r <= 1.15) return 'success'
  if (r >= 0.65 && r <= 1.30) return 'warning'
  return 'danger'
}

const STATUS_COLORS: Record<Status, string> = {
  success: '#1D9E75',
  warning: '#F59E0B',
  danger:  '#EF4444',
  neutral: '#D1D5DB',
}

const STATUS_BADGE: Record<Status, string> = {
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger:  'bg-red-100 text-red-700',
  neutral: 'bg-gray-100 text-gray-500',
}

const STATUS_LABEL: Record<Status, string> = {
  success: 'Dentro da meta',
  warning: 'Próximo da meta',
  danger:  'Fora da meta',
  neutral: 'Sem dados',
}

// ─── Demo data generator ──────────────────────────────────────────────────────

function buildDemoData(period: Period): DayData[] {
  const today = new Date()
  const currentMonday = getMondayOf(today)

  if (period === 'month') {
    // Return 4 weekly aggregates
    return DEMO_KCAL.map((weekKcal, wi) => {
      const weekMonday = addDays(currentMonday, -wi * 7)
      const weekEnd    = addDays(weekMonday, 6)
      const avgCal     = Math.round(weekKcal.reduce((s, c) => s + c, 0) / weekKcal.length)
      const protein    = Math.round(avgCal * 0.30 / 4)
      const carbs      = Math.round(avgCal * 0.45 / 4)
      const fat        = Math.round(avgCal * 0.25 / 9)
      return {
        dateStr: toLocalISODate(weekMonday),
        label:   `${fmtShort(weekMonday)}–${fmtShort(weekEnd)}`,
        calories: avgCal,
        protein,
        carbs,
        fat,
      }
    }).reverse() // chronological order
  }

  const weekOffset = period === 'previous' ? -7 : 0
  const monday     = addDays(currentMonday, weekOffset)
  const kcalSet    = DEMO_KCAL[period === 'previous' ? 1 : 0]

  return Array.from({ length: 7 }, (_, i) => {
    const day  = addDays(monday, i)
    const kcal = kcalSet[i]
    return {
      dateStr:  toLocalISODate(day),
      label:    fmtDay(day),
      calories: kcal,
      protein:  Math.round(kcal * 0.30 / 4),
      carbs:    Math.round(kcal * 0.45 / 4),
      fat:      Math.round(kcal * 0.25 / 9),
    }
  })
}

// ─── Supabase fetcher ─────────────────────────────────────────────────────────

async function fetchPeriodData(userId: string, period: Period): Promise<DayData[] | null> {
  const today         = new Date()
  const currentMonday = getMondayOf(today)

  let startMonday: Date
  switch (period) {
    case 'current':  startMonday = currentMonday; break
    case 'previous': startMonday = addDays(currentMonday, -7); break
    case 'month':    startMonday = addDays(currentMonday, -21); break
  }

  const startStr = toLocalISODate(startMonday)
  const endStr   = toLocalISODate(currentMonday) // inclusive of current week start

  const { data: plans, error: planErr } = await supabase
    .from('weekly_plans')
    .select('id, semana_inicio')
    .eq('user_id', userId)
    .gte('semana_inicio', startStr)
    .lte('semana_inicio', endStr)

  if (planErr || !plans?.length) return null

  const { data: slots, error: slotErr } = await supabase
    .from('meal_slots')
    .select('plan_id, dia_semana, calorias, proteina, carbs, gordura')
    .in('plan_id', plans.map(p => p.id))

  if (slotErr || !slots?.length) return null

  // Map plan_id → semana_inicio
  const planMap = new Map(plans.map(p => [p.id, p.semana_inicio]))

  // Aggregate per day
  const dayMap = new Map<string, DayData>()

  for (const slot of slots) {
    const weekStart = planMap.get(slot.plan_id)
    if (!weekStart) continue

    const day     = addDays(parseISODate(weekStart), slot.dia_semana)
    const dateStr = toLocalISODate(day)

    const existing = dayMap.get(dateStr) ?? {
      dateStr,
      label:    fmtDay(day),
      calories: 0,
      protein:  0,
      carbs:    0,
      fat:      0,
    }

    dayMap.set(dateStr, {
      ...existing,
      calories: existing.calories + slot.calorias,
      protein:  existing.protein  + slot.proteina,
      carbs:    existing.carbs    + slot.carbs,
      fat:      existing.fat      + slot.gordura,
    })
  }

  const days = Array.from(dayMap.values()).sort((a, b) => a.dateStr.localeCompare(b.dateStr))

  if (period !== 'month') return days

  // For month view: aggregate by week
  const weeks: DayData[] = []
  for (let wi = 0; wi < 4; wi++) {
    const wStart  = addDays(startMonday, wi * 7)
    const wEnd    = addDays(wStart, 6)
    const wDays   = days.filter(d => d.dateStr >= toLocalISODate(wStart) && d.dateStr <= toLocalISODate(wEnd))
    if (!wDays.length) continue
    const n       = wDays.length
    weeks.push({
      dateStr:  toLocalISODate(wStart),
      label:    `${fmtShort(wStart)}–${fmtShort(wEnd)}`,
      calories: Math.round(wDays.reduce((s, d) => s + d.calories, 0) / n),
      protein:  Math.round(wDays.reduce((s, d) => s + d.protein,  0) / n),
      carbs:    Math.round(wDays.reduce((s, d) => s + d.carbs,    0) / n),
      fat:      Math.round(wDays.reduce((s, d) => s + d.fat,      0) / n),
    })
  }
  return weeks
}

// ─── Computed stats ───────────────────────────────────────────────────────────

interface Stats {
  avgCalories: number
  avgProtein:  number
  avgCarbs:    number
  avgFat:      number
  maxDay:      DayData | null
  minDay:      DayData | null
  totalProtein: number
}

function computeStats(days: DayData[]): Stats {
  const planned = days.filter(d => d.calories > 0)
  if (!planned.length) {
    return { avgCalories: 0, avgProtein: 0, avgCarbs: 0, avgFat: 0,
             maxDay: null, minDay: null, totalProtein: 0 }
  }
  const n = planned.length
  const sum = (key: keyof DayData) => planned.reduce((s, d) => s + (d[key] as number), 0)
  return {
    avgCalories:  Math.round(sum('calories') / n),
    avgProtein:   Math.round(sum('protein')  / n),
    avgCarbs:     Math.round(sum('carbs')    / n),
    avgFat:       Math.round(sum('fat')      / n),
    maxDay:       planned.reduce((a, b) => b.calories > a.calories ? b : a),
    minDay:       planned.reduce((a, b) => b.calories < a.calories ? b : a),
    totalProtein: sum('protein'),
  }
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function CaloriesTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const val = payload[0].value
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-[11px] font-semibold text-gray-500">{label}</p>
      <p className="text-base font-bold text-gray-900">{val.toLocaleString('pt-BR')} kcal</p>
    </div>
  )
}

function DonutTooltip({ active, payload }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: { pct: number } }>
}) {
  if (!active || !payload?.length) return null
  const { name, value, payload: p } = payload[0]
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-[11px] font-semibold text-gray-500">{name}</p>
      <p className="text-sm font-bold text-gray-900">{value}g — {p.pct}%</p>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PeriodSelector({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const options: { key: Period; label: string }[] = [
    { key: 'current',  label: 'Semana atual' },
    { key: 'previous', label: 'Semana passada' },
    { key: 'month',    label: 'Último mês' },
  ]
  return (
    <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
      {options.map(o => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
            value === o.key
              ? 'bg-brand text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-800',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

interface SummaryCardProps {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  status?: Status
  iconBg: string
  iconFg: string
}

function SummaryCard({ icon, label, value, sub, status, iconBg, iconFg }: SummaryCardProps) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', iconBg)}>
        <span className={iconFg}>{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
        <p className="mt-0.5 text-2xl font-bold leading-none text-gray-900">{value}</p>
        {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
        {status && status !== 'neutral' && (
          <span className={cn('mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold', STATUS_BADGE[status])}>
            {STATUS_LABEL[status]}
          </span>
        )}
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="h-11 w-11 rounded-xl bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 rounded bg-gray-200" />
          <div className="h-7 w-32 rounded bg-gray-200" />
          <div className="h-3 w-20 rounded bg-gray-200" />
        </div>
      </div>
    </div>
  )
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────

function MacroDonut({ stats, goals }: { stats: Stats; goals: Goals }) {
  const { avgProtein, avgCarbs, avgFat } = stats
  const total = avgProtein * 4 + avgCarbs * 4 + avgFat * 9 // total kcal from macros

  const data = [
    { name: 'Proteína', value: avgProtein, pct: total > 0 ? Math.round((avgProtein * 4 / total) * 100) : 0, color: MACRO_COLORS.protein },
    { name: 'Carbs',    value: avgCarbs,   pct: total > 0 ? Math.round((avgCarbs   * 4 / total) * 100) : 0, color: MACRO_COLORS.carbs   },
    { name: 'Gordura',  value: avgFat,     pct: total > 0 ? Math.round((avgFat     * 9 / total) * 100) : 0, color: MACRO_COLORS.fat     },
  ]

  const proteinGoalStatus = macroStatus(avgProtein, goals.protein)

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center">
      {/* Chart */}
      <div className="relative mx-auto h-52 w-52 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map(d => <Cell key={d.name} fill={d.color} />)}
            </Pie>
            <Tooltip content={<DonutTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xl font-bold text-gray-900">
            {stats.avgCalories > 0 ? stats.avgCalories.toLocaleString('pt-BR') : '—'}
          </p>
          <p className="text-[11px] font-semibold text-gray-400">kcal/dia</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex-1 space-y-4">
        <h3 className="text-sm font-bold text-gray-800">Distribuição de Macros</h3>
        <p className="text-xs text-gray-500">Médias diárias do período selecionado</p>

        <div className="space-y-3">
          {data.map(d => (
            <div key={d.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="font-semibold text-gray-700">{d.name}</span>
                </div>
                <span className="font-bold text-gray-900">{d.value}g <span className="text-gray-400 font-normal">({d.pct}%)</span></span>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${d.pct}%`, background: d.color }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Protein goal indicator */}
        <div className={cn(
          'mt-2 rounded-lg border px-3 py-2 text-xs',
          proteinGoalStatus === 'success' ? 'border-green-200 bg-green-50'  :
          proteinGoalStatus === 'warning' ? 'border-amber-200 bg-amber-50'  :
                                           'border-red-200   bg-red-50',
        )}>
          <span className="font-semibold text-gray-700">Meta de proteína: </span>
          <span className="font-bold">{goals.protein}g/dia</span>
          <span className={cn(
            'ml-2 font-semibold',
            proteinGoalStatus === 'success' ? 'text-green-600' :
            proteinGoalStatus === 'warning' ? 'text-amber-600' : 'text-red-600',
          )}>
            {STATUS_LABEL[proteinGoalStatus]}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

function CaloriesBarChart({ data, goal }: { data: DayData[]; goal: number }) {
  const maxCal = Math.max(...data.map(d => d.calories), goal * 1.3)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-800">Calorias por Dia</h3>
          <p className="mt-0.5 text-xs text-gray-500">Comparativo com a meta diária</p>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-[11px]">
          {[
            { color: STATUS_COLORS.success, label: 'Dentro da meta' },
            { color: STATUS_COLORS.warning, label: 'Próximo' },
            { color: STATUS_COLORS.danger,  label: 'Fora da meta' },
            { color: STATUS_COLORS.neutral, label: 'Sem dados' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
              <span className="text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} barCategoryGap="30%" margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9CA3AF' }}
            axisLine={false}
            tickLine={false}
            domain={[0, Math.ceil(maxCal / 200) * 200]}
            tickFormatter={v => `${(v / 1000).toFixed(v >= 1000 ? 1 : 0)}k`}
            width={36}
          />
          <Tooltip content={<CaloriesTooltip />} cursor={{ fill: '#F9FAFB', radius: 4 }} />
          <ReferenceLine
            y={goal}
            stroke="#9CA3AF"
            strokeDasharray="5 4"
            strokeWidth={1.5}
            label={{
              value: `Meta ${goal.toLocaleString('pt-BR')}`,
              position: 'insideTopRight',
              fontSize: 10,
              fill: '#9CA3AF',
              fontWeight: 600,
            }}
          />
          <Bar dataKey="calories" radius={[5, 5, 0, 0]} maxBarSize={64}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={STATUS_COLORS[calorieStatus(entry.calories, goal)]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MacrosPage() {
  const [period,   setPeriod]   = useState<Period>('current')
  const [data,     setData]     = useState<DayData[]>([])
  const [goals,    setGoals]    = useState<Goals>(DEFAULT_GOALS)
  const [loading,  setLoading]  = useState(true)
  const [isDemo,   setIsDemo]   = useState(false)

  // ── Data fetching ─────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('unauthenticated')

      // Load user goals
      const { data: profile } = await supabase
        .from('users')
        .select('calorias_meta, proteina_meta')
        .eq('id', user.id)
        .maybeSingle()

      if (profile) {
        setGoals({
          calories: profile.calorias_meta ?? DEFAULT_GOALS.calories,
          protein:  profile.proteina_meta ?? DEFAULT_GOALS.protein,
        })
      }

      const rows = await fetchPeriodData(user.id, period)
      if (!rows?.length) throw new Error('no data')

      setData(rows)
      setIsDemo(false)
    } catch {
      setData(buildDemoData(period))
      setIsDemo(true)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { load() }, [load])

  // ── Derived ───────────────────────────────────────────────────────────────

  const stats = useMemo(() => computeStats(data), [data])

  const calStatus  = calorieStatus(stats.avgCalories, goals.calories)
  const protStatus = macroStatus(stats.avgProtein,   goals.protein)

  const periodLabel = useMemo(() => {
    if (!data.length) return ''
    const first = data[0]
    const last  = data[data.length - 1]
    if (period === 'current' || period === 'previous') {
      const start = parseISODate(first.dateStr)
      const end   = parseISODate(last.dateStr)
      return `${fmtShort(start)} – ${fmtShort(end)}`
    }
    return 'Últimas 4 semanas'
  }, [data, period])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-10">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Macros &amp; Calorias</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {periodLabel}
            {isDemo && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                Dados de exemplo
              </span>
            )}
          </p>
        </div>
        <PeriodSelector value={period} onChange={p => { setPeriod(p) }} />
      </div>

      {/* ── Summary cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : (
          <>
            <SummaryCard
              icon={<Flame className="h-5 w-5" />}
              label="Média diária"
              value={`${stats.avgCalories.toLocaleString('pt-BR')} kcal`}
              sub={`Meta: ${goals.calories.toLocaleString('pt-BR')} kcal`}
              status={calStatus}
              iconBg="bg-orange-100"
              iconFg="text-orange-500"
            />
            <SummaryCard
              icon={<Dumbbell className="h-5 w-5" />}
              label="Proteína total"
              value={`${stats.totalProtein.toLocaleString('pt-BR')}g`}
              sub={`Média: ${stats.avgProtein}g/dia`}
              status={protStatus}
              iconBg="bg-blue-100"
              iconFg="text-blue-500"
            />
            <SummaryCard
              icon={<TrendingUp className="h-5 w-5" />}
              label="Dia mais calórico"
              value={stats.maxDay ? `${stats.maxDay.calories.toLocaleString('pt-BR')} kcal` : '—'}
              sub={stats.maxDay?.label}
              iconBg="bg-red-100"
              iconFg="text-red-500"
            />
            <SummaryCard
              icon={<TrendingDown className="h-5 w-5" />}
              label="Dia menos calórico"
              value={stats.minDay ? `${stats.minDay.calories.toLocaleString('pt-BR')} kcal` : '—'}
              sub={stats.minDay?.label}
              iconBg="bg-green-100"
              iconFg="text-green-600"
            />
          </>
        )}
      </div>

      {/* ── Bar chart ────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="h-[360px] animate-pulse rounded-xl border border-gray-200 bg-white shadow-sm" />
      ) : (
        <CaloriesBarChart data={data} goal={goals.calories} />
      )}

      {/* ── Donut + macro breakdown ───────────────────────────────────────── */}
      {loading ? (
        <div className="h-[260px] animate-pulse rounded-xl border border-gray-200 bg-white shadow-sm" />
      ) : (
        <MacroDonut stats={stats} goals={goals} />
      )}

      {/* ── Day-by-day breakdown table ────────────────────────────────────── */}
      {!loading && data.length > 0 && period !== 'month' && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-gray-50/60 px-5 py-3">
            <h3 className="text-sm font-bold text-gray-800">Detalhamento por Dia</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {/* Header */}
            <div className="grid grid-cols-5 px-5 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              <span>Dia</span>
              <span className="text-right">Calorias</span>
              <span className="text-right" style={{ color: MACRO_COLORS.protein }}>Prot.</span>
              <span className="text-right" style={{ color: MACRO_COLORS.carbs   }}>Carbs</span>
              <span className="text-right" style={{ color: MACRO_COLORS.fat     }}>Gord.</span>
            </div>
            {data.map(day => {
              const st = calorieStatus(day.calories, goals.calories)
              return (
                <div key={day.dateStr} className={cn(
                  'grid grid-cols-5 px-5 py-3 text-sm transition-colors hover:bg-gray-50/60',
                  day.calories === 0 && 'opacity-40',
                )}>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: STATUS_COLORS[st] }}
                      title={STATUS_LABEL[st]}
                    />
                    <span className="font-semibold text-gray-700">{day.label}</span>
                  </div>
                  <span className="text-right font-bold text-gray-900">
                    {day.calories > 0 ? `${day.calories.toLocaleString('pt-BR')} kcal` : '—'}
                  </span>
                  <span className="text-right font-medium text-blue-600">
                    {day.protein > 0 ? `${day.protein}g` : '—'}
                  </span>
                  <span className="text-right font-medium text-amber-600">
                    {day.carbs > 0 ? `${day.carbs}g` : '—'}
                  </span>
                  <span className="text-right font-medium text-rose-500">
                    {day.fat > 0 ? `${day.fat}g` : '—'}
                  </span>
                </div>
              )
            })}
          </div>
          {/* Goal row */}
          <div className="grid grid-cols-5 border-t border-gray-200 bg-gray-50/80 px-5 py-3 text-sm font-bold text-gray-500">
            <span>Meta/dia</span>
            <span className="text-right text-brand">{goals.calories.toLocaleString('pt-BR')} kcal</span>
            <span className="text-right" style={{ color: MACRO_COLORS.protein }}>{goals.protein}g</span>
            <span className="col-span-2" />
          </div>
        </div>
      )}
    </div>
  )
}
