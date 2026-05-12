'use client'

import { useCallback, useState } from 'react'
import { WeeklyCalendar } from '@/components/WeeklyCalendar'
import { MealModal }      from '@/components/MealModal'
import { upsertMealSlot } from '@/lib/store'
import type { MealSlot, MealType } from '@/types'

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

  return (
    <>
      <WeeklyCalendar
        onAddMeal={openAdd}
        onEditMeal={openEdit}
        onWeekStartChange={setWeekStart}
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
    </>
  )
}
