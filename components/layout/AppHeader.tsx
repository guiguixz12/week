'use client'

import { Menu } from 'lucide-react'
import { usePathname } from 'next/navigation'

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

// ─── AppHeader ────────────────────────────────────────────────────────────────

interface AppHeaderProps {
  onMenuClick: () => void
}

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  const title = usePageTitle()

  return (
    <header className="lg:hidden flex h-12 shrink-0 items-center gap-3 border-b border-[#1e293b] bg-[#0f172a] px-4">
      <button
        aria-label="Abrir menu"
        onClick={onMenuClick}
        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-[#1e293b] hover:text-slate-200"
      >
        <Menu className="h-5 w-5" />
      </button>
      <h1 className="text-sm font-semibold text-white tracking-tight">{title}</h1>
    </header>
  )
}
