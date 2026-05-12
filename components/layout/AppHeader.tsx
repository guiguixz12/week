'use client'

import { Bell, Menu, Search } from 'lucide-react'
import { usePathname } from 'next/navigation'

// ─── Page title map ───────────────────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':     'Minha Semana',
  '/receitas':      'Receitas',
  '/macros':         'Macros & Calorias',
  '/compras':        'Lista de Compras',
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

// ─── IconButton ───────────────────────────────────────────────────────────────

function IconButton({
  label,
  children,
  badge,
  onClick,
}: {
  label: string
  children: React.ReactNode
  badge?: boolean
  onClick?: () => void
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className="relative rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
    >
      {children}
      {badge && (
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand ring-2 ring-white" />
      )}
    </button>
  )
}

// ─── AppHeader ────────────────────────────────────────────────────────────────

interface AppHeaderProps {
  onMenuClick: () => void
}

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  const title = usePageTitle()

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">

      {/* Left: hamburger (mobile) + page title */}
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

      {/* Right: search, notifications, avatar */}
      <div className="flex items-center gap-1">
        <IconButton label="Buscar">
          <Search className="h-4 w-4" />
        </IconButton>

        <IconButton label="Notificações" badge>
          <Bell className="h-4 w-4" />
        </IconButton>

        {/* Avatar */}
        <button
          aria-label="Menu do usuário"
          className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 ring-2 ring-brand/20 transition-all hover:ring-brand/40"
        >
          <span className="text-xs font-bold text-brand">GS</span>
        </button>
      </div>
    </header>
  )
}
