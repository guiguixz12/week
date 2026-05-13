'use client'

import { useCallback, useState } from 'react'
import { WeeklyCalendar }    from '@/components/WeeklyCalendar'
import { MealModal }         from '@/components/MealModal'
import { GeneratePlanModal } from '@/components/GeneratePlanModal'
import { upsertMealSlot, saveWeekPlan } from '@/lib/store'
import type { MealSlot, MealType, WeekPlan } from '@/types'

interface ModalState {
  isOpen:        boolean
  date:          string
  mealType:      MealType
  existingSlot?: MealSlot
}

const CLOSED: ModalState = { isOpen: false, date: '', mealType: 'breakfast' }

export default function DashboardPage() {
  const [modal,      setModal]      = useState<ModalState>(CLOSED)
  const [weekStart,  setWeekStart]  = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [generateOpen,      setGenerateOpen]      = useState(false)
  const [generateWeekStart, setGenerateWeekStart] = useState('')

  function openAdd(date: string, mealType: MealType) {
    setModal({ isOpen: true, date, mealType })
  }

  function openEdit(slot: MealSlot, date: string) {
    setModal({ isOpen: true, date, mealType: slot.mealType, existingSlot: slot })
  }

  const handleSave = useCallback((slot: Omit<MealSlot, 'id'>) => {
    if (!modal.date || !weekStart) return
    upsertMealSlot(weekStart, modal.date, modal.mealType, slot)
    setModal(CLOSED)
    setRefreshKey(k => k + 1)
  }, [modal.date, modal.mealType, weekStart])

  const handleDelete = useCallback(() => {
    if (!modal.date || !weekStart) return
    upsertMealSlot(weekStart, modal.date, modal.mealType, null)
    setModal(CLOSED)
    setRefreshKey(k => k + 1)
  }, [modal.date, modal.mealType, weekStart])

  function handleOpenGenerate(ws: string) {
    setGenerateWeekStart(ws)
    setGenerateOpen(true)
  }

  function handlePlanGenerated(plan: WeekPlan) {
    saveWeekPlan(plan)
    setGenerateOpen(false)
    setRefreshKey(k => k + 1)
  }

  return (
    <>
      <WeeklyCalendar
        onAddMeal={openAdd}
        onEditMeal={openEdit}
        onWeekStartChange={setWeekStart}
        onGeneratePlan={handleOpenGenerate}
        refreshKey={refreshKey}
      />
      <MealModal
        isOpen={modal.isOpen}
        date={modal.date}
        mealType={modal.mealType}
        existingSlot={modal.existingSlot}
        onClose={() => setModal(CLOSED)}
        onSave={handleSave}
        onDelete={modal.existingSlot ? handleDelete : undefined}
      />
      <GeneratePlanModal
        isOpen={generateOpen}
        weekStart={generateWeekStart}
        onClose={() => setGenerateOpen(false)}
        onSuccess={handlePlanGenerated}
      />
    </>
  )
}
