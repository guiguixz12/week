'use client'

import { useEffect, useState } from 'react'
import { OnboardingWizard } from './OnboardingWizard'
import { getProfile } from '@/lib/profile'

type Status = 'loading' | 'wizard' | 'app'

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    const profile = getProfile()
    setStatus(profile.onboarding_done ? 'app' : 'wizard')
  }, [])

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    )
  }

  if (status === 'wizard') {
    return <OnboardingWizard onComplete={() => setStatus('app')} />
  }

  return <>{children}</>
}
