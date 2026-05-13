'use client'

import { cn } from '@/lib/utils'
import {
  BarChart2,
  CalendarDays,
  ChefHat,
  Crown,
  ShoppingCart,
  Target,
  User,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV_MAIN = [
  { href: '/dashboard', label: 'Minha Semana',    icon: CalendarDays },
  { href: '/receitas',  label: 'Receitas',         icon: ChefHat },
  { href: '/macros',    label: 'Macros',           icon: BarChart2 },
  { href: '/compras',   label: 'Lista de Compras', icon: ShoppingCart },
]

const NAV_ACCOUNT = [
  { href: '/configuracoes', label: 'Perfil',    icon: User },
  { href: '/objetivos',     label: 'Objetivos', icon: Target },
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
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
        active
          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold'
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5',
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()

  function isActive(href: string) {
    return pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
  }

  function goToPro() {
    router.push('/configuracoes')
    onClose()
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
          'fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-sidebar-dark border-r border-sidebar-border',
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
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 group-hover:from-emerald-500/30 group-hover:to-emerald-600/30 transition-colors">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 text-emerald-400"
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

        {/* ── Nav ─────────────────────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {/* Main nav */}
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

          {/* Account section */}
          <p className="mb-1 mt-4 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-600">
            Minha Conta
          </p>
          <ul className="space-y-0.5">
            {NAV_ACCOUNT.map(item => (
              <li key={item.href}>
                <NavItem
                  {...item}
                  active={isActive(item.href)}
                  onClick={onClose}
                />
              </li>
            ))}

            {/* Plano Pro — special non-link item */}
            <li>
              <button
                onClick={goToPro}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all duration-200"
              >
                <Crown className="h-[18px] w-[18px] shrink-0 text-amber-400" />
                <span className="truncate">Plano Pro</span>
              </button>
            </li>
          </ul>
        </nav>
      </aside>
    </>
  )
}
