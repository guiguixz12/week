import { AppShell } from '@/components/layout/AppShell'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen">
      <AppShell>{children}</AppShell>
    </div>
  )
}
