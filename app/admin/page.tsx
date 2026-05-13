'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import {
  Lock, Eye, EyeOff, Check, Copy, AlertCircle, CheckCircle2,
  Sparkles, Webhook, RefreshCw, Save, ChevronDown, ChevronUp, Info,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Config {
  n8nWebhookUrl:    string | null
  openAiConfigured: boolean
  mode:             'openai' | 'n8n' | 'none'
  savedAt:          string | null
}

// ─── Copy helper ──────────────────────────────────────────────────────────────

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null)
  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }
  return { copied, copy }
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ title, children, defaultOpen = true }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors">
        <span className="font-semibold text-gray-900">{title}</span>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {open && <div className="border-t border-gray-100 px-6 py-5">{children}</div>}
    </div>
  )
}

// ─── Mode badge ───────────────────────────────────────────────────────────────

function ModeBadge({ mode }: { mode: Config['mode'] }) {
  const styles = {
    openai: 'bg-green-100 text-green-700',
    n8n:    'bg-purple-100 text-purple-700',
    none:   'bg-red-100 text-red-600',
  }
  const labels = {
    openai: '✓ OpenAI direta',
    n8n:    '✓ n8n',
    none:   '✗ Sem gerador configurado',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${styles[mode]}`}>
      {labels[mode]}
    </span>
  )
}

// ─── Login ────────────────────────────────────────────────────────────────────

function LoginScreen({ onAuth }: { onAuth: (pwd: string) => void }) {
  const [pwd, setPwd]         = useState('')
  const [show, setShow]       = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    const res = await fetch('/api/admin/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwd }),
    })
    setLoading(false)
    if (res.ok) { onAuth(pwd) } else { setError('Senha incorreta.') }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 p-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/20">
            <Lock className="h-8 w-8 text-brand" />
          </div>
          <h1 className="text-2xl font-bold text-white">Painel Admin</h1>
          <p className="text-sm text-gray-400">Acesso restrito.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input type={show ? 'text' : 'password'} value={pwd} onChange={e => setPwd(e.target.value)}
              placeholder="Senha" autoFocus
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 pr-12 text-white placeholder:text-gray-500 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30" />
            <button type="button" onClick={() => setShow(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && <p className="flex items-center gap-2 text-sm text-red-400"><AlertCircle className="h-4 w-4" /> {error}</p>}
          <button type="submit" disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-60">
            {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
            {loading ? 'Verificando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ password }: { password: string }) {
  const [config,    setConfig]    = useState<Config | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [n8nUrl,    setN8nUrl]    = useState('')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle')
  const [saveError, setSaveError] = useState('')
  const [testState, setTestState] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [showUrl,   setShowUrl]   = useState(false)
  const { copied, copy } = useCopy()

  const loadConfig = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      const data = await res.json() as Config
      setConfig(data)
      setN8nUrl(data.n8nWebhookUrl ?? '')
    }
    setLoading(false)
  }, [password])

  useEffect(() => { loadConfig() }, [loadConfig])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaveState('saving'); setSaveError('')
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, n8nWebhookUrl: n8nUrl.trim() }),
      })
      const json = await res.json() as { config?: Config; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Erro ao salvar')
      setConfig(json.config!)
      setSaveState('ok')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao salvar')
      setSaveState('error')
    }
    setTimeout(() => setSaveState('idle'), 3000)
  }

  async function handleTest() {
    setTestState('testing')
    try {
      const res = await fetch('/api/n8n/trigger', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'test', objetivo: 'manter', calorias_meta: 2000, proteina_meta: 150 }),
      })
      setTestState(res.ok || res.status === 202 ? 'ok' : 'error')
    } catch {
      setTestState('error')
    }
    setTimeout(() => setTestState('idle'), 4000)
  }

  async function handleClearN8n() {
    setN8nUrl('')
    const res = await fetch('/api/admin/config', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, n8nWebhookUrl: '' }),
    })
    if (res.ok) {
      const json = await res.json() as { config: Config }
      setConfig(json.config)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <RefreshCw className="h-6 w-6 animate-spin text-brand" />
      </div>
    )
  }
  if (!config) return null

  const isTestUrl = n8nUrl.includes('/webhook-test/')

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="mx-auto max-w-2xl space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Painel Admin</h1>
            <p className="text-sm text-gray-400">Configurações internas</p>
          </div>
          <button onClick={loadConfig} className="flex items-center gap-2 rounded-xl bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors">
            <RefreshCw className="h-4 w-4" /> Atualizar
          </button>
        </div>

        {/* Status atual do gerador de planos */}
        <div className="rounded-2xl bg-gray-900 ring-1 ring-gray-800 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Gerador de planos ativo</p>
          <div className="flex items-center gap-3">
            {config.mode === 'n8n'    && <Webhook   className="h-6 w-6 text-purple-400" />}
            {config.mode === 'openai' && <Sparkles  className="h-6 w-6 text-green-400" />}
            {config.mode === 'none'   && <AlertCircle className="h-6 w-6 text-red-400" />}
            <div>
              <ModeBadge mode={config.mode} />
              <p className="mt-1 text-xs text-gray-500">
                {config.mode === 'n8n'    && 'Planos gerados pelo n8n (via webhook)'}
                {config.mode === 'openai' && 'Planos gerados diretamente pela OpenAI'}
                {config.mode === 'none'   && 'Configure a OpenAI (OPENAI_API_KEY) ou o n8n abaixo'}
              </p>
            </div>
          </div>
        </div>

        {/* Configurar n8n */}
        <Section title="Integração n8n (opcional)">
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-200 p-3">
            <Info className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
            <p className="text-xs text-blue-700">
              O n8n é <strong>opcional</strong>. Se deixar em branco, o SaaS usa a OpenAI diretamente —
              que já funciona se a <code className="font-mono">OPENAI_API_KEY</code> estiver configurada no EasyPanel.
              Configure o n8n apenas se quiser usar um fluxo personalizado.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                URL do Webhook n8n
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={showUrl ? n8nUrl : (n8nUrl ? '•'.repeat(Math.min(n8nUrl.length, 40)) : '')}
                  onChange={e => { if (showUrl) setN8nUrl(e.target.value) }}
                  onFocus={() => setShowUrl(true)}
                  placeholder="https://seu-n8n.dominio.com/webhook/id-do-fluxo"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-20 font-mono text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button type="button" onClick={() => setShowUrl(s => !s)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors">
                    {showUrl ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  {n8nUrl && (
                    <button type="button" onClick={() => copy(n8nUrl, 'url')}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors">
                      {copied === 'url' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              </div>

              {isTestUrl && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <div className="text-xs text-amber-700">
                    <strong>URL de teste detectada</strong> — só funciona com o editor n8n aberto.
                    Para produção, substitua <code className="font-mono">/webhook-test/</code> por <code className="font-mono">/webhook/</code>
                  </div>
                </div>
              )}
            </div>

            {saveState === 'error' && saveError && (
              <p className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" /> {saveError}
              </p>
            )}

            <div className="flex items-center gap-3">
              <button type="submit" disabled={saveState === 'saving'}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all ${
                  saveState === 'ok'    ? 'bg-green-600' :
                  saveState === 'error' ? 'bg-red-600' :
                  'bg-brand hover:bg-brand-600 disabled:opacity-60'
                }`}>
                {saveState === 'saving' && <RefreshCw className="h-4 w-4 animate-spin" />}
                {saveState === 'ok'     && <CheckCircle2 className="h-4 w-4" />}
                {saveState === 'idle'   && <Save className="h-4 w-4" />}
                {saveState === 'saving' ? 'Salvando…' : saveState === 'ok' ? 'Salvo!' : 'Salvar'}
              </button>

              {config.n8nWebhookUrl && (
                <>
                  <button type="button" onClick={handleTest} disabled={testState === 'testing'}
                    className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                      testState === 'ok'    ? 'border-green-500 bg-green-50 text-green-700' :
                      testState === 'error' ? 'border-red-300 bg-red-50 text-red-600' :
                      'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}>
                    {testState === 'testing' && <RefreshCw className="h-4 w-4 animate-spin" />}
                    {testState === 'ok'      && <CheckCircle2 className="h-4 w-4" />}
                    {testState === 'error'   && <AlertCircle className="h-4 w-4" />}
                    {testState === 'idle' ? 'Testar' : testState === 'testing' ? 'Testando…' : testState === 'ok' ? 'OK!' : 'Falhou'}
                  </button>

                  <button type="button" onClick={handleClearN8n}
                    className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors">
                    Remover n8n
                  </button>
                </>
              )}
            </div>

            {config.savedAt && (
              <p className="text-xs text-gray-400">Último save: {new Date(config.savedAt).toLocaleString('pt-BR')}</p>
            )}
          </form>
        </Section>

        {/* Como o n8n deve responder */}
        {config.n8nWebhookUrl && (
          <Section title="Como configurar o n8n" defaultOpen={false}>
            <div className="space-y-4 text-sm text-gray-700">
              <p>O SaaS envia os dados do usuário para o n8n assim que ele conclui o onboarding. O n8n deve responder com o plano gerado.</p>

              <div className="space-y-2">
                <p className="font-semibold text-gray-900">No n8n, crie este fluxo:</p>
                <ol className="space-y-1 text-gray-600 list-decimal list-inside">
                  <li><strong>Webhook</strong> — recebe os dados do usuário</li>
                  <li><strong>AI Agent / OpenAI</strong> — gera o plano alimentar</li>
                  <li><strong>Respond to Webhook</strong> — retorna o plano para o SaaS</li>
                </ol>
              </div>

              <div className="rounded-xl bg-gray-900 p-4">
                <p className="text-xs text-gray-400 mb-2">Dados recebidos pelo n8n (body do webhook):</p>
                <pre className="text-xs text-gray-300 overflow-x-auto">{`{
  "userId": "uuid-do-usuario",
  "objetivo": "emagrecer",
  "calorias_meta": 1800,
  "proteina_meta": 150,
  "restricoes": ["sem_gluten"],
  "weekStart": "2026-05-11"
}`}</pre>
              </div>

              <div className="rounded-xl bg-gray-900 p-4">
                <p className="text-xs text-gray-400 mb-2">O n8n deve responder com este JSON:</p>
                <pre className="text-xs text-gray-300 overflow-x-auto">{`{
  "dias": [
    {
      "dia": "Segunda-feira",
      "cafe_da_manha": { "nome": "Omelete",      "calorias": 320, "proteina": 22, "carbs": 5,  "gordura": 18 },
      "lanche":        { "nome": "Iogurte grego", "calorias": 150, "proteina": 15, "carbs": 10, "gordura": 3  },
      "almoco":        { "nome": "Frango e arroz", "calorias": 550, "proteina": 45, "carbs": 60, "gordura": 12 },
      "jantar":        { "nome": "Salmão",         "calorias": 400, "proteina": 38, "carbs": 8,  "gordura": 22 }
    }
    // 7 dias no total
  ]
}`}</pre>
              </div>

              <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-xs text-green-700">
                Use o nó <strong>Respond to Webhook</strong> no final do fluxo n8n para enviar a resposta
                de volta para o SaaS na mesma chamada. O SaaS espera até 58 segundos pela resposta.
              </div>
            </div>
          </Section>
        )}

        <p className="text-center text-xs text-gray-600 pb-4">Painel Admin — acesso restrito</p>
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [password, setPassword] = useState<string | null>(null)

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_pwd')
    if (saved) setPassword(saved)
  }, [])

  function handleAuth(pwd: string) {
    sessionStorage.setItem('admin_pwd', pwd)
    setPassword(pwd)
  }

  if (!password) return <LoginScreen onAuth={handleAuth} />
  return <Dashboard password={password} />
}
