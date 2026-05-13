'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Lock, Mail, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/Input'
import { BrandPanel, NutriWeekLogo } from '../_components'

// ─── Error translation ────────────────────────────────────────────────────────

function translateError(msg: string): string {
  if (msg.includes('User already registered'))    return 'Este email já está cadastrado.'
  if (msg.includes('user_already_exists'))        return 'Este email já está cadastrado.'
  if (msg.includes('Password should be at least')) return 'A senha deve ter pelo menos 6 caracteres.'
  if (msg.includes('rate limit'))                 return 'Muitas tentativas. Aguarde alguns minutos.'
  if (msg.includes('over_email_send_rate_limit')) return 'Muitas tentativas. Aguarde alguns minutos.'
  if (msg.includes('invalid email'))              return 'Email inválido.'
  if (msg.includes('Email signups are disabled')) return 'Cadastro por email está desativado no Supabase.'
  if (msg.includes('signup_disabled'))            return 'Cadastros estão desativados no momento.'
  if (msg.includes('email_address_not_authorized')) return 'Este email não está autorizado.'
  // Mostra o erro original para diagnóstico
  return `Erro: ${msg}`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SignupPage() {
  const router = useRouter()

  const [nome,           setNome]           = useState('')
  const [email,          setEmail]          = useState('')
  const [password,       setPassword]       = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState('')
  const [emailSent,      setEmailSent]      = useState(false)

  // Client-side validation
  function validate(): string | null {
    if (!nome.trim()) return 'Informe seu nome.'
    if (password.length < 6) return 'A senha deve ter pelo menos 6 caracteres.'
    if (password !== confirmPassword) return 'As senhas não coincidem.'
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationError = validate()
    if (validationError) { setError(validationError); return }

    setError('')
    setLoading(true)
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nome: nome.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (authError) throw authError

      // If session exists → email confirmation disabled, go straight to onboarding
      if (data.session) {
        router.push('/onboarding')
      } else {
        // Email confirmation required
        setEmailSent(true)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(translateError(msg))
    } finally {
      setLoading(false)
    }
  }

  // ── Email sent confirmation screen ──────────────────────────────────────────
  if (emailSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F1117] p-8">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10">
            <Mail className="h-8 w-8 text-brand" />
          </div>
          <h1 className="text-xl font-bold text-[#E6EDF3]">Verifique seu email</h1>
          <p className="mt-2 text-sm text-[#8B949E]">
            Enviamos um link de confirmação para{' '}
            <span className="font-medium text-[#E6EDF3]">{email}</span>.
            Clique no link para ativar sua conta.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            Ir para o login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Left brand panel ─────────────────────────────────────────────── */}
      <BrandPanel />

      {/* ── Right form panel ─────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-[#0F1117] p-8">
        <div className="w-full max-w-sm">

          {/* Logo — mobile only */}
          <div className="mb-8 flex justify-center lg:hidden">
            <NutriWeekLogo size="md" dark />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-[#E6EDF3]">
            Crie sua conta
          </h1>
          <p className="mt-1 text-sm text-[#8B949E]">
            Comece a planejar sua dieta em minutos
          </p>

          {/* Error banner */}
          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              label="Nome completo"
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Guilherme Silva"
              leftIcon={<User className="h-4 w-4" />}
              autoComplete="name"
              required
            />
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
              placeholder="Mínimo 6 caracteres"
              leftIcon={<Lock className="h-4 w-4" />}
              autoComplete="new-password"
              hint="Mínimo de 6 caracteres"
              required
            />
            <Input
              label="Confirmar senha"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              leftIcon={<Lock className="h-4 w-4" />}
              autoComplete="new-password"
              error={
                confirmPassword && confirmPassword !== password
                  ? 'As senhas não coincidem'
                  : undefined
              }
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-semibold text-white transition-all hover:bg-brand-600 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Criando conta…' : 'Criar conta grátis'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-[#8B949E]">
            Ao criar uma conta, você concorda com nossos{' '}
            <Link href="/terms" className="text-brand hover:underline">
              Termos de Uso
            </Link>{' '}
            e{' '}
            <Link href="/privacy" className="text-brand hover:underline">
              Política de Privacidade
            </Link>
            .
          </p>

          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-[#2D333B]" />
            <span className="text-xs text-[#8B949E]">ou</span>
            <span className="h-px flex-1 bg-[#2D333B]" />
          </div>

          <p className="text-center text-sm text-[#8B949E]">
            Já tem conta?{' '}
            <Link href="/login" className="font-semibold text-brand hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
