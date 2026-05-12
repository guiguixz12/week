import { AppShell } from '@/components/layout/AppShell'
import { ToastProvider } from '@/components/ui/Toast'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen">
      <AppShell>{children}</AppShell>
      <ToastProvider />
    </div>
  )
}
