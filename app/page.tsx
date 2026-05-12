import { redirect } from 'next/navigation'

// Root URL redireciona para o dashboard principal
export default function RootPage() {
  redirect('/dashboard')
}
