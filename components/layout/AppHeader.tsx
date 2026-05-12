'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell, Menu, Search, Settings, Target, LogOut, X, ChefHat, CalendarDays, CheckCircle2 } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { getRecipes, getPreferences } from '@/lib/store'

// ─── Page title map ───────────────────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':     'Minha Semana',
  '/receitas':      'Receitas',
  '/macros':        'Macros & Calorias',
  '/compras':       'Lista de Compras',
  '/objetivos':     'Objetivos',
  '/configuracoes': 'Configurações',
}

function usePageTitle(): string {
  const pathname = usePathname()
  const exact = PAGE_TITLES[pathname]
  if (exact) return exact
  const partial = Object.entries(PAGE_TITLES).find(([key]) => key !== '/' && pathname.startsWith(key))
  return partial?.[1] ?? 'NutriWeek'
}

// ─── Mock notifications ───────────────────────────────────────────────────────

interface Notification {
  id: string
  message: string
  read: boolean
  time: string
  icon: React.ReactNode
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    message: 'Você ainda não planejou o jantar de Sábado',
    read: false,
    time: 'Agora',
    icon: <CalendarDays className="h-4 w-4 text-amber-500" />,
  },
  {
    id: '2',
    message: 'Sua semana está abaixo da meta de proteína',
    read: false,
    time: '2h atrás',
    icon: <Target className="h-4 w-4 text-red-500" />,
  },
  {
    id: '3',
    message: 'Lista de compras atualizada',
    read: true,
    time: 'Ontem',
    icon: <CheckCircle2 className="h-4 w-4 text-brand" />,
  },
]

// ─── GlobalSearch ─────────────────────────────────────────────────────────────

interface SearchResult {
  id: string
  label: string
  group: string
  emoji?: string
  href?: string
}

function GlobalSearch({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const q = query.toLowerCase()

    const recipes = getRecipes()
      .filter(r => r.nome.toLowerCase().includes(q))
      .slice(0, 3)
      .map(r => ({ id: r.id, label: r.nome, group: 'Receitas', emoji: r.emoji, href: '/receitas' }))

    const pages: SearchResult[] = [
      { id: 'dash',  label: 'Minha Semana',    group: 'Páginas', emoji: '📅', href: '/dashboard' },
      { id: 'macro', label: 'Macros & Calorias', group: 'Páginas', emoji: '📊', href: '/macros' },
      { id: 'comp',  label: 'Lista de Compras', group: 'Páginas', emoji: '🛒', href: '/compras' },
      { id: 'obj',   label: 'Objetivos',        group: 'Páginas', emoji: '🎯', href: '/objetivos' },
      { id: 'cfg',   label: 'Configurações',    group: 'Páginas', emoji: '⚙️', href: '/configuracoes' },
    ].filter(p => p.label.toLowerCase().includes(q))

    setResults([...recipes, ...pages])
  }, [query])

  const groups = Array.from(new Set(results.map(r => r.group)))

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 pt-[15vh] backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3.5">
          <Search className="h-5 w-5 shrink-0 text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar receitas, páginas..."
            className="flex-1 text-base text-gray-800 placeholder:text-gray-400 focus:outline-none"
          />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        {results.length > 0 ? (
          <div className="max-h-80 overflow-y-auto py-2">
            {groups.map(group => (
              <div key={group}>
                <p className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">{group}</p>
                {results.filter(r => r.group === group).map(r => (
                  <Link
                    key={r.id}
                    href={r.href ?? '#'}
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50"
                  >
                    {r.emoji && <span className="text-lg leading-none">{r.emoji}</span>}
                    <span className="text-sm font-medium text-gray-800">{r.label}</span>
                    <span className="ml-auto text-xs text-gray-400">{group}</span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        ) : query.trim() ? (
          <div className="flex flex-col items-center py-10 text-gray-400">
            <Search className="mb-2 h-8 w-8" />
            <p className="text-sm">Nenhum resultado para &ldquo;{query}&rdquo;</p>
          </div>
        ) : (
          <div className="flex flex-col items-center py-10 text-gray-400">
            <Search className="mb-2 h-8 w-8" />
            <p className="text-sm">Digite para buscar</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── NotificationsPanel ───────────────────────────────────────────────────────

function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const [notifs, setNotifs] = useState(MOCK_NOTIFICATIONS)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    setTimeout(() => document.addEventListener('mousedown', handleClick), 0)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  function markRead(id: string) {
    setNotifs(n => n.map(x => x.id === id ? { ...x, read: true } : x))
  }

  const unread = notifs.filter(n => !n.read).length

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-gray-200 bg-white shadow-xl"
    >
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <span className="font-bold text-gray-900">Notificações</span>
        {unread > 0 && (
          <button
            onClick={() => setNotifs(n => n.map(x => ({ ...x, read: true })))}
            className="text-xs font-semibold text-brand hover:underline"
          >
            Marcar todas como lidas
          </button>
        )}
      </div>
      <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
        {notifs.map(n => (
          <button
            key={n.id}
            onClick={() => markRead(n.id)}
            className={cn(
              'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50',
              !n.read && 'bg-brand/5',
            )}
          >
            <span className="mt-0.5 shrink-0">{n.icon}</span>
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm leading-tight', n.read ? 'text-gray-500' : 'font-semibold text-gray-900')}>
                {n.message}
              </p>
              <p className="mt-0.5 text-[11px] text-gray-400">{n.time}</p>
            </div>
            {!n.read && (
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── UserMenu ─────────────────────────────────────────────────────────────────

function UserMenu({ onClose }: { onClose: () => void }) {
  const router  = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)
  const prefs   = getPreferences()

  const initials = prefs.nome
    ? prefs.nome.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
    : 'GS'

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
    }
    setTimeout(() => document.addEventListener('mousedown', handleClick), 0)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-12 z-50 w-60 rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden"
    >
      {/* User info */}
      <div className="border-b border-gray-100 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10">
            <span className="text-sm font-bold text-brand">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-gray-900">{prefs.nome || 'Usuário'}</p>
            <p className="truncate text-xs text-gray-500">{prefs.email || 'Plano Free'}</p>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="py-1.5">
        <Link
          href="/configuracoes"
          onClick={onClose}
          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          <Settings className="h-4 w-4 text-gray-400" />
          Configurações
        </Link>
        <Link
          href="/objetivos"
          onClick={onClose}
          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          <Target className="h-4 w-4 text-gray-400" />
          Objetivos
        </Link>
        <Link
          href="/receitas"
          onClick={onClose}
          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          <ChefHat className="h-4 w-4 text-gray-400" />
          Receitas
        </Link>
      </div>

      <div className="border-t border-gray-100 py-1.5">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" />
          Sair da conta
        </button>
      </div>
    </div>
  )
}

// ─── AppHeader ────────────────────────────────────────────────────────────────

interface AppHeaderProps {
  onMenuClick: () => void
}

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  const title = usePageTitle()
  const prefs = getPreferences()

  const [searchOpen, setSearchOpen]  = useState(false)
  const [notifOpen, setNotifOpen]    = useState(false)
  const [userOpen, setUserOpen]      = useState(false)

  const unreadCount = MOCK_NOTIFICATIONS.filter(n => !n.read).length

  const initials = prefs.nome
    ? prefs.nome.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
    : 'GS'

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            aria-label="Abrir menu"
            onClick={onMenuClick}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">{title}</h1>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1">
          {/* Search */}
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Buscar"
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => { setNotifOpen(o => !o); setUserOpen(false) }}
              aria-label="Notificações"
              className="relative rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
                  {unreadCount}
                </span>
              )}
            </button>
            {notifOpen && <NotificationsPanel onClose={() => setNotifOpen(false)} />}
          </div>

          {/* User avatar */}
          <div className="relative ml-1">
            <button
              onClick={() => { setUserOpen(o => !o); setNotifOpen(false) }}
              aria-label="Menu do usuário"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 ring-2 ring-brand/20 transition-all hover:ring-brand/40"
            >
              <span className="text-xs font-bold text-brand">{initials}</span>
            </button>
            {userOpen && <UserMenu onClose={() => setUserOpen(false)} />}
          </div>
        </div>
      </header>

      {/* Global search overlay */}
      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
    </>
  )
}
