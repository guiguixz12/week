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
import { usePathname } from 'next/navigation'

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
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
        active
          ? 'bg-white text-brand shadow-sm'
          : 'text-white/75 hover:bg-white/10 hover:text-white',
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
          'fixed inset-y-0 left-0 z-50 flex w-[200px] flex-col bg-brand',
          'transition-transform duration-300 ease-in-out',
          // desktop — lift back into flex flow
          'lg:static lg:z-auto lg:translate-x-0',
          // mobile open/close
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* ── Logo ────────────────────────────────────────────────────────── */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-4">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-2.5"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20">
              {/* Leaf icon built with SVG to avoid extra deps */}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 text-white"
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
            className="rounded-md p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Main nav ────────────────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-white/35">
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
        <div className="shrink-0 border-t border-white/10 px-3 py-4 space-y-1">
          <NavItem
            href="/configuracoes"
            label="Configurações"
            icon={Settings}
            active={isActive('/configuracoes')}
            onClick={onClose}
          />

          {/* User avatar row */}
          <div className="mt-3 flex items-center gap-3 rounded-lg px-3 py-2.5 group cursor-pointer hover:bg-white/10 transition-colors">
            <div className="relative shrink-0">
              <div className="h-8 w-8 rounded-full bg-white/25 flex items-center justify-center ring-2 ring-white/20">
                <span className="text-[11px] font-bold text-white">GS</span>
              </div>
              {/* Online dot */}
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-300 ring-2 ring-brand" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white leading-tight truncate">
                Guilherme
              </p>
              <p className="text-[11px] text-white/45 leading-tight">Plano Pro</p>
            </div>
            <LogOut className="h-3.5 w-3.5 shrink-0 text-white/30 group-hover:text-white/60 transition-colors" />
          </div>
        </div>
      </aside>
    </>
  )
}
