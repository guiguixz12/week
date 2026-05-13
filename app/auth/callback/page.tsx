'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) { router.replace('/login'); return }

    supabase.auth.exchangeCodeForSession(code).then(({ data }) => {
      router.replace(data.session ? '/dashboard' : '/login')
    })
  }, [searchParams, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F1117]">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        <p className="text-sm text-[#8B949E]">Confirmando sua conta…</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#0F1117]">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  )
}
