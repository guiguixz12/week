'use client'

import { cn } from '@/lib/utils'
import {
  BarChart2,
  CalendarDays,
  ChefHat,
  LogOut,
  Settings,
  ShoppingCart,
  Target,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { getPreferences } from '@/lib/store'
import { supabase } from '@/lib/supabase'

// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV_MAIN = [
  { href: '/dashboard',  label: 'Minha Semana',    icon: CalendarDays },
  { href: '/receitas',  label: 'Receitas',         icon: ChefHat },
  { href: '/macros',    label: 'Macros',           icon: BarChart2 },
  { href: '/compras',   label: 'Lista de Compras', icon: ShoppingCart },
  { href: '/objetivos', label: 'Objetivos',        icon: Target },
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

// ─── NavItem ─────────────────────────────────────────────────────────────────

interface NavItemProps {
  href: string
  label: string
  icon: React.ElementType
  active: boolean
  onClick: () => void
}

function NavItem({ href, label, icon: Icon, active, onClick }: NavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 relative',
        active
          ? 'text-cyan-400 bg-cyan-400/10'
          : 'text-slate-400 hover:text-slate-200 hover:bg-sidebar-hover',
      )}
    >
      {active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-cyan-400" />
      )}
      <Icon className="h-[18px] w-[18px] shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const prefs    = getPreferences()

  const initials = prefs.nome
    ? prefs.nome.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
    : 'GS'

  const displayName = prefs.nome ? prefs.nome.split(' ')[0] : 'Usuário'

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function isActive(href: string) {
    return pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Panel */}
      <aside
        className={cn(
          // base — always a fixed overlay on mobile
          'fixed inset-y-0 left-0 z-50 flex w-[200px] flex-col bg-sidebar-dark border-r border-sidebar-border',
          'transition-transform duration-300 ease-in-out',
          // desktop — lift back into flex flow
          'lg:static lg:z-auto lg:translate-x-0',
          // mobile open/close
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* ── Logo ────────────────────────────────────────────────────────── */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-4">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-2.5 group"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 group-hover:from-cyan-500/30 group-hover:to-cyan-600/30 transition-colors">
              {/* Leaf icon built with SVG to avoid extra deps */}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 text-cyan-400"
              >
                <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
              </svg>
            </div>
            <span className="text-[15px] font-bold tracking-tight text-white">
              NutriWeek
            </span>
          </Link>

          {/* Close — mobile only */}
          <button
            onClick={onClose}
            aria-label="Fechar menu"
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-sidebar-hover hover:text-slate-200 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Main nav ────────────────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Principal
          </p>
          <ul className="space-y-0.5">
            {NAV_MAIN.map(item => (
              <li key={item.href}>
                <NavItem
                  {...item}
                  active={isActive(item.href)}
                  onClick={onClose}
                />
              </li>
            ))}
          </ul>
        </nav>

        {/* ── Bottom: settings + user ──────────────────────────────────────── */}
        <div className="shrink-0 border-t border-sidebar-border px-3 py-4 space-y-1">
          <NavItem
            href="/configuracoes"
            label="Configurações"
            icon={Settings}
            active={isActive('/configuracoes')}
            onClick={onClose}
          />

          {/* User avatar row */}
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 group cursor-pointer hover:bg-sidebar-hover transition-colors text-left"
          >
            <div className="relative shrink-0">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-500/40 to-cyan-600/40 flex items-center justify-center ring-2 ring-cyan-500/30">
                <span className="text-[11px] font-bold text-cyan-300">{initials}</span>
              </div>
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-sidebar-dark" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white leading-tight truncate">
                {displayName}
              </p>
              <p className="text-[11px] text-slate-400 leading-tight">Sair</p>
            </div>
            <LogOut className="h-3.5 w-3.5 shrink-0 text-slate-500 group-hover:text-slate-300 transition-colors" />
          </button>
        </div>
      </aside>
    </>
  )
}
