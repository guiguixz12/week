'use client'

import { useState } from 'react'
import { WeeklyCalendar } from '@/components/WeeklyCalendar'
import { MealModal }      from '@/components/MealModal'
import type { MealSlot, MealType } from '@/types'

interface ModalState {
  isOpen:        boolean
  date:          string
  mealType:      MealType
  existingSlot?: MealSlot
}

const CLOSED: ModalState = { isOpen: false, date: '', mealType: 'breakfast' }

export default function DashboardPage() {
  const [modal, setModal] = useState<ModalState>(CLOSED)

  function openAdd(date: string, mealType: MealType) {
    setModal({ isOpen: true, date, mealType })
  }

  function openEdit(slot: MealSlot, date: string) {
    setModal({ isOpen: true, date, mealType: slot.mealType, existingSlot: slot })
  }

  function handleSave(slot: Omit<MealSlot, 'id'>) {
    // TODO: persist via Supabase (lib/db.ts — upsertMealSlot)
    console.log('Saving slot:', slot, 'date:', modal.date)
    setModal(CLOSED)
  }

  return (
    <>
      <WeeklyCalendar onAddMeal={openAdd} onEditMeal={openEdit} />
      <MealModal
        isOpen={modal.isOpen}
        date={modal.date}
        mealType={modal.mealType}
        existingSlot={modal.existingSlot}
        onClose={() => setModal(CLOSED)}
        onSave={handleSave}
      />
    </>
  )
}
