// Componentes compartilhados entre as páginas de autenticação

import { cn } from '@/lib/utils'

// ─── Logo ─────────────────────────────────────────────────────────────────────

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  dark?: boolean
}

export function NutriWeekLogo({ size = 'md', dark = false }: LogoProps) {
  const sizes = {
    sm: { icon: 'h-7 w-7', text: 'text-lg', inner: 'h-3.5 w-3.5' },
    md: { icon: 'h-10 w-10', text: 'text-2xl', inner: 'h-5 w-5' },
    lg: { icon: 'h-14 w-14', text: 'text-3xl', inner: 'h-7 w-7' },
  }
  const s = sizes[size]

  return (
    <div className="flex items-center gap-3">
      <div className={cn(
        s.icon,
        'flex items-center justify-center rounded-xl',
        dark ? 'bg-brand' : 'bg-white/20',
      )}>
        <LeafIcon className={cn(s.inner, dark ? 'text-white' : 'text-white')} />
      </div>
      <span className={cn(s.text, 'font-bold', dark ? 'text-[#E6EDF3]' : 'text-white')}>
        NutriWeek
      </span>
    </div>
  )
}

function LeafIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  )
}

// ─── BrandPanel ───────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: '📅', text: 'Calendário semanal de refeições' },
  { icon: '📊', text: 'Controle de macros em tempo real' },
  { icon: '🥗', text: 'Mais de 200 alimentos cadastrados' },
  { icon: '🎯', text: 'Metas personalizadas por objetivo' },
]

export function BrandPanel() {
  return (
    <div className="relative hidden flex-col items-start justify-center overflow-hidden bg-brand px-12 lg:flex lg:w-[480px] xl:w-[520px]">
      {/* Background decorative circles */}
      <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/5" />
      <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-white/5" />

      <div className="relative z-10">
        <NutriWeekLogo size="lg" />

        <p className="mt-6 text-lg font-medium leading-relaxed text-white/80">
          Planejamento nutricional inteligente para você alcançar seus objetivos de saúde.
        </p>

        <ul className="mt-10 space-y-4">
          {FEATURES.map(f => (
            <li key={f.text} className="flex items-center gap-3 text-white/90">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 text-base">
                {f.icon}
              </span>
              <span className="text-sm font-medium">{f.text}</span>
            </li>
          ))}
        </ul>

        <div className="mt-12 rounded-2xl border border-white/20 bg-white/10 p-5">
          <p className="text-sm italic text-white/75">
            &ldquo;Desde que comecei a usar o NutriWeek, perdi 8 kg em 3 meses sem passar fome. A organização faz toda a diferença!&rdquo;
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white">
              AM
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Ana Martins</p>
              <p className="text-xs text-white/60">Perdeu 8kg em 3 meses</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
