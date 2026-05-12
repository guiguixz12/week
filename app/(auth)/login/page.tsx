'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Lock, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/Input'
import { BrandPanel, NutriWeekLogo } from '../_components'

// ─── Error translation ────────────────────────────────────────────────────────

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Email ou senha inválidos.'
  if (msg.includes('Email not confirmed'))        return 'Confirme seu email antes de entrar.'
  if (msg.includes('rate limit'))                 return 'Muitas tentativas. Aguarde alguns minutos.'
  return 'Ocorreu um erro. Tente novamente.'
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(translateError(msg))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Left brand panel (hidden on mobile) ─────────────────────────── */}
      <BrandPanel />

      {/* ── Right form panel ────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white p-8">
        <div className="w-full max-w-sm">

          {/* Logo — visible only on mobile */}
          <div className="mb-8 flex justify-center lg:hidden">
            <NutriWeekLogo size="md" dark />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Bem-vindo de volta
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Entre na sua conta para continuar
          </p>

          {/* Error banner */}
          {error && (
            <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              leftIcon={<Mail className="h-4 w-4" />}
              autoComplete="email"
              required
            />

            <Input
              label="Senha"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              leftIcon={<Lock className="h-4 w-4" />}
              autoComplete="current-password"
              required
            />

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-brand hover:underline"
              >
                Esqueceu a senha?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-semibold text-white transition-all hover:bg-brand-600 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400">ou</span>
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          <p className="text-center text-sm text-gray-500">
            Não tem conta?{' '}
            <Link href="/signup" className="font-semibold text-brand hover:underline">
              Criar conta grátis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
