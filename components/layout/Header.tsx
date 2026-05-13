import { Salad } from 'lucide-react'
import Link from 'next/link'

export function Header() {
  return (
    <header className="border-b border-[#2D333B] bg-[#161B22]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-brand text-xl">
            <Salad className="h-6 w-6" />
            NutriWeek
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium text-[#8B949E]">
            <Link href="/planner" className="hover:text-brand transition-colors">Planejador</Link>
            <Link href="/meals" className="hover:text-brand transition-colors">Refeições</Link>
            <Link href="/profile" className="hover:text-brand transition-colors">Perfil</Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
