'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import {
  Bell, ChevronRight, CreditCard, LogOut, Save,
  Shield, Sparkles, User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { getPreferences, savePreferences, type UserPreferences } from '@/lib/store'
import { getProfile, saveProfile, type DietaryPref } from '@/lib/profile'
import { supabase } from '@/lib/supabase'

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200',
        checked ? 'bg-brand' : 'bg-gray-200',
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
          {icon}
        </div>
        <h2 className="font-bold text-gray-900">{title}</h2>
      </div>
      {children}
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const DIETARY_PREFS: { key: keyof UserPreferences; label: string; desc: string }[] = [
  { key: 'vegetariano', label: 'Vegetariano',  desc: 'Sem carne vermelha ou frango' },
  { key: 'vegano',      label: 'Vegano',       desc: 'Sem nenhum produto animal' },
  { key: 'sem_gluten',  label: 'Sem glúten',   desc: 'Restrição de trigo, aveia, cevada' },
  { key: 'sem_lactose', label: 'Sem lactose',  desc: 'Restrição de laticínios' },
  { key: 'low_carb',    label: 'Low carb',     desc: 'Baixo teor de carboidratos' },
  { key: 'cetogenico',  label: 'Cetogênico',   desc: 'Muito low carb + alto em gordura' },
]

export default function ConfiguracoesPage() {
  const [prefs, setPrefs]   = useState<UserPreferences>(() => {
    const p = getPreferences()
    // Bug 9: fall back to profile nome if preferences nome is empty
    if (!p.nome) {
      const profile = getProfile()
      if (profile.nome) p.nome = profile.nome
    }
    return p
  })
  const [saving, setSaving] = useState(false)
  const avatarInputRef      = useRef<HTMLInputElement>(null)

  // Sync email from Supabase session
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email && !prefs.email) {
        setPrefs(p => ({ ...p, email: data.user!.email! }))
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function setField<K extends keyof UserPreferences>(k: K, v: UserPreferences[K]) {
    setPrefs(p => ({ ...p, [k]: v }))
  }

  async function handleSave() {
    setSaving(true)
    savePreferences(prefs)

    // Bug 5: sync dietary prefs + nome to nw_profile so all pages read consistent data
    const dietaryKeys: DietaryPref[] = ['vegetariano', 'vegano', 'sem_gluten', 'sem_lactose', 'low_carb', 'cetogenico']
    const preferencias = dietaryKeys.filter(k => !!prefs[k as keyof UserPreferences])
    saveProfile({
      nome:                prefs.nome,
      preferencias,
      alimentos_nao_gosta: prefs.alimentos_evitar,
    })

    try {
      if (prefs.nome) {
        await supabase.auth.updateUser({ data: { nome: prefs.nome } })
      }
    } catch {
      // non-critical
    }
    setSaving(false)
    toast('Configurações salvas!', 'success')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const initials = prefs.nome
    ? prefs.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : 'GS'

  return (
    <div className="mx-auto max-w-2xl space-y-5">

      {/* Profile */}
      <Section icon={<User className="h-5 w-5 text-brand" />} title="Perfil">
        {/* Avatar */}
        <div className="mb-5 flex items-center gap-4">
          <div
            onClick={() => avatarInputRef.current?.click()}
            className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-2xl bg-brand/10 ring-2 ring-brand/20 transition-all hover:ring-brand/40"
          >
            <span className="text-xl font-bold text-brand">{initials}</span>
          </div>
          <div>
            <p className="font-semibold text-gray-900">{prefs.nome || 'Seu nome'}</p>
            <p className="text-sm text-gray-500">{prefs.email || 'email@exemplo.com'}</p>
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="mt-1 text-xs font-semibold text-brand hover:underline"
            >
              Alterar foto
            </button>
          </div>
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Nome completo</label>
            <input
              value={prefs.nome}
              onChange={e => setField('nome', e.target.value)}
              placeholder="Seu nome"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Email</label>
            <input
              value={prefs.email}
              readOnly
              className="w-full cursor-default rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-500"
            />
          </div>
        </div>
      </Section>

      {/* Plan */}
      <Section icon={<CreditCard className="h-5 w-5 text-brand" />} title="Plano">
        <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-brand/5 to-brand/10 p-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand" />
              <span className="font-bold text-gray-900">Plano Free</span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">Até 5 receitas · 1 semana de planejamento</p>
          </div>
          <button className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-600 transition-colors">
            Upgrade Pro <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </Section>

      {/* Dietary preferences */}
      <Section icon={<Shield className="h-5 w-5 text-brand" />} title="Preferências alimentares">
        <p className="mb-4 text-xs text-gray-500">
          Essas preferências são usadas automaticamente pelo Gerador IA ao criar planos.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {DIETARY_PREFS.map(({ key, label, desc }) => (
            <div
              key={key}
              onClick={() => setField(key, !prefs[key] as UserPreferences[typeof key])}
              className={cn(
                'flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all',
                prefs[key] ? 'border-brand/40 bg-brand/5' : 'border-gray-200 hover:border-gray-300',
              )}
            >
              <div>
                <p className={cn('text-sm font-semibold', prefs[key] ? 'text-brand' : 'text-gray-800')}>{label}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
              <Toggle checked={!!prefs[key]} onChange={v => setField(key, v as UserPreferences[typeof key])} />
            </div>
          ))}
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-semibold text-gray-600">
            Alimentos que não gosto (separados por vírgula)
          </label>
          <textarea
            value={prefs.alimentos_evitar}
            onChange={e => setField('alimentos_evitar', e.target.value)}
            placeholder="Ex: fígado, chuchu, jiló..."
            rows={2}
            className="w-full resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
      </Section>

      {/* Notifications */}
      <Section icon={<Bell className="h-5 w-5 text-brand" />} title="Notificações">
        <div className="divide-y divide-gray-100">
          {(
            [
              { key: 'notif_planejamento', label: 'Lembrete de planejamento semanal', desc: 'Toda segunda-feira às 8h' },
              { key: 'notif_compras',      label: 'Lista de compras gerada',          desc: 'Quando a semana é planejada' },
              { key: 'notif_relatorio',    label: 'Relatório semanal de macros',      desc: 'Todo domingo às 20h' },
            ] as { key: keyof UserPreferences; label: string; desc: string }[]
          ).map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-semibold text-gray-800">{label}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
              <Toggle checked={!!prefs[key]} onChange={v => setField(key, v as UserPreferences[typeof key])} />
            </div>
          ))}
        </div>
      </Section>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair da conta
        </button>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors shadow-sm"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Salvando…' : 'Salvar configurações'}
        </button>
      </div>
    </div>
  )
}
