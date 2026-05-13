'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, X, XCircle, Info } from 'lucide-react'
import { dismissToast, subscribeToasts, type ToastItem } from '@/lib/toast'
import { cn } from '@/lib/utils'

const ICONS = {
  success: <CheckCircle className="h-4 w-4 text-green-500" />,
  error:   <XCircle    className="h-4 w-4 text-red-500"   />,
  info:    <Info       className="h-4 w-4 text-blue-500"  />,
}

const BORDERS = {
  success: 'border-green-200 bg-green-50',
  error:   'border-red-200   bg-red-50',
  info:    'border-blue-200  bg-blue-50',
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => subscribeToasts(setToasts), [])

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2"
    >
      {toasts.map(t => (
        <div
          key={t.id}
          className={cn(
            'flex min-w-[260px] max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-lg',
            'animate-in slide-in-from-bottom-2 duration-200',
            BORDERS[t.type],
          )}
        >
          <span className="mt-0.5 shrink-0">{ICONS[t.type]}</span>
          <p className="flex-1 text-sm font-medium text-[#E6EDF3]">{t.message}</p>
          <button
            onClick={() => dismissToast(t.id)}
            className="shrink-0 text-[#8B949E] hover:text-[#8B949E]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
