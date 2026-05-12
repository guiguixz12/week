import { Salad } from 'lucide-react'
import Link from 'next/link'

export function Header() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-green-600 text-xl">
            <Salad className="h-6 w-6" />
            NutriWeek
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium text-gray-600">
            <Link href="/planner" className="hover:text-green-600 transition-colors">Planejador</Link>
            <Link href="/meals" className="hover:text-green-600 transition-colors">Refeições</Link>
            <Link href="/profile" className="hover:text-green-600 transition-colors">Perfil</Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
