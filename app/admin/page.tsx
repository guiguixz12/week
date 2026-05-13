'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import {
  Lock, Eye, EyeOff, AlertCircle, CheckCircle2,
  Sparkles, Webhook, RefreshCw, Save, ChevronDown, ChevronUp, Info, Trash2,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Config {
  n8nWebhookUrl:    string | null
  openAiConfigured: boolean
  openAiSource:     'admin' | 'env' | null
  openAiKeyMasked:  string | null
  mode:             'openai' | 'n8n' | 'none'
  savedAt:          string | null
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
  const cfg = {
    openai: { cls: 'bg-green-100 text-green-700',   label: '✓ OpenAI — pronto para usar' },
    n8n:    { cls: 'bg-purple-100 text-purple-700',  label: '✓ n8n configurado' },
    none:   { cls: 'bg-red-100 text-red-600',        label: '✗ Nenhum gerador configurado' },
  }[mode]
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${cfg.cls}`}>{cfg.label}</span>
}

// ─── Secret input ─────────────────────────────────────────────────────────────

function SecretInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-12 font-mono text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
      />
      <button type="button" onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

// ─── Save button ──────────────────────────────────────────────────────────────

function SaveBtn({ state, error }: { state: 'idle' | 'saving' | 'ok' | 'error'; error?: string }) {
  return (
    <div className="space-y-2">
      {state === 'error' && error && (
        <p className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </p>
      )}
      <button type="submit" disabled={state === 'saving'}
        className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all ${
          state === 'ok'    ? 'bg-green-600' :
          state === 'error' ? 'bg-red-600'   :
          'bg-brand hover:bg-brand-600 disabled:opacity-60'
        }`}>
        {state === 'saving' && <RefreshCw className="h-4 w-4 animate-spin" />}
        {state === 'ok'     && <CheckCircle2 className="h-4 w-4" />}
        {state === 'idle'   && <Save className="h-4 w-4" />}
        {state === 'saving' ? 'Salvando…' : state === 'ok' ? 'Salvo!' : 'Salvar'}
      </button>
    </div>
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
          {error && <p className="flex items-center gap-2 text-sm text-red-400"><AlertCircle className="h-4 w-4" />{error}</p>}
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
  const [config,       setConfig]       = useState<Config | null>(null)
  const [loading,      setLoading]      = useState(true)

  // OpenAI key form
  const [aiKey,        setAiKey]        = useState('')
  const [aiState,      setAiState]      = useState<'idle' | 'saving' | 'ok' | 'error'>('idle')
  const [aiError,      setAiError]      = useState('')

  // n8n URL form
  const [n8nUrl,       setN8nUrl]       = useState('')
  const [n8nState,     setN8nState]     = useState<'idle' | 'saving' | 'ok' | 'error'>('idle')
  const [n8nError,     setN8nError]     = useState('')
  const [testState,    setTestState]    = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')

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
      // never pre-fill the key for security — user always types it fresh
    }
    setLoading(false)
  }, [password])

  useEffect(() => { loadConfig() }, [loadConfig])

  async function save(updates: Record<string, string>, setState: (s: 'idle'|'saving'|'ok'|'error') => void, setErr: (e: string) => void) {
    setState('saving'); setErr('')
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, ...updates }),
      })
      const json = await res.json() as { config?: Config; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Erro ao salvar')
      setConfig(json.config!)
      setState('ok')
    } catch (err) {
      setErr(err instanceof Error ? err.message : 'Erro ao salvar')
      setState('error')
    }
    setTimeout(() => setState('idle'), 3000)
  }

  function handleSaveAi(e: React.FormEvent) {
    e.preventDefault()
    if (!aiKey.trim()) return
    save({ openAiKey: aiKey.trim() }, setAiState, setAiError)
    setAiKey('') // clear field after save
  }

  function handleRemoveAi() {
    save({ openAiKey: '' }, setAiState, setAiError)
  }

  function handleSaveN8n(e: React.FormEvent) {
    e.preventDefault()
    save({ n8nWebhookUrl: n8nUrl.trim() }, setN8nState, setN8nError)
  }

  function handleRemoveN8n() {
    setN8nUrl('')
    save({ n8nWebhookUrl: '' }, setN8nState, setN8nError)
  }

  async function handleTest() {
    setTestState('testing')
    try {
      const res = await fetch('/api/n8n/trigger', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'test', objetivo: 'manter', calorias_meta: 2000, proteina_meta: 150 }),
      })
      setTestState(res.ok || res.status === 202 ? 'ok' : 'error')
    } catch { setTestState('error') }
    setTimeout(() => setTestState('idle'), 4000)
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
          <button onClick={loadConfig}
            className="flex items-center gap-2 rounded-xl bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors">
            <RefreshCw className="h-4 w-4" /> Atualizar
          </button>
        </div>

        {/* Status */}
        <div className="rounded-2xl bg-gray-900 ring-1 ring-gray-800 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Status do gerador de planos</p>
          <div className="flex items-center gap-3">
            {config.mode === 'n8n'    && <Webhook    className="h-6 w-6 text-purple-400" />}
            {config.mode === 'openai' && <Sparkles   className="h-6 w-6 text-green-400" />}
            {config.mode === 'none'   && <AlertCircle className="h-6 w-6 text-red-400" />}
            <div>
              <ModeBadge mode={config.mode} />
              <p className="mt-1 text-xs text-gray-500">
                {config.mode === 'openai' && config.openAiSource === 'admin' && `Chave configurada aqui no admin (${config.openAiKeyMasked})`}
                {config.mode === 'openai' && config.openAiSource === 'env'   && `Chave vinda do EasyPanel (${config.openAiKeyMasked})`}
                {config.mode === 'n8n'    && 'Planos gerados pelo n8n'}
                {config.mode === 'none'   && 'Configure a chave da OpenAI abaixo para começar'}
              </p>
            </div>
          </div>
        </div>

        {/* ── OpenAI API Key ─────────────────────────────────────────────────── */}
        <Section title="Chave da OpenAI (OPENAI_API_KEY)">
          {config.openAiConfigured && (
            <div className="mb-4 flex items-center justify-between rounded-xl bg-green-50 border border-green-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  Chave ativa: <span className="font-mono">{config.openAiKeyMasked}</span>
                  {config.openAiSource === 'admin' && ' (salva aqui)'}
                  {config.openAiSource === 'env'   && ' (vinda do EasyPanel)'}
                </span>
              </div>
              {config.openAiSource === 'admin' && (
                <button type="button" onClick={handleRemoveAi}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" /> Remover
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleSaveAi} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                {config.openAiConfigured ? 'Trocar chave' : 'Cole sua chave aqui'}
              </label>
              <SecretInput
                value={aiKey}
                onChange={setAiKey}
                placeholder="sk-proj-..."
              />
              <p className="text-xs text-gray-400">
                Encontre sua chave em{' '}
                <span className="font-mono text-gray-600">platform.openai.com → API keys</span>.
                A chave nunca é exibida após salvar.
              </p>
            </div>
            <SaveBtn state={aiState} error={aiError} />
          </form>
        </Section>

        {/* ── n8n (opcional) ─────────────────────────────────────────────────── */}
        <Section title="Integração n8n (opcional)" defaultOpen={false}>
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-200 p-3">
            <Info className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
            <p className="text-xs text-blue-700">
              Se configurar o n8n, os planos passam a ser gerados por ele em vez da OpenAI direta.
              Deixe em branco para usar só a OpenAI.
            </p>
          </div>

          <form onSubmit={handleSaveN8n} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                URL do Webhook n8n
              </label>
              <input
                type="text"
                value={n8nUrl}
                onChange={e => setN8nUrl(e.target.value)}
                placeholder="https://seu-n8n.dominio.com/webhook/id-do-fluxo"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
              />
              {isTestUrl && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    URL de teste — só funciona com o editor n8n aberto. Troque <code className="font-mono">/webhook-test/</code> por <code className="font-mono">/webhook/</code>
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <SaveBtn state={n8nState} error={n8nError} />
              {config.n8nWebhookUrl && (
                <>
                  <button type="button" onClick={handleTest} disabled={testState === 'testing'}
                    className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                      testState === 'ok'      ? 'border-green-500 bg-green-50 text-green-700' :
                      testState === 'error'   ? 'border-red-300 bg-red-50 text-red-600'       :
                      'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}>
                    {testState === 'testing' && <RefreshCw className="h-4 w-4 animate-spin" />}
                    {testState === 'ok'      && <CheckCircle2 className="h-4 w-4" />}
                    {testState === 'error'   && <AlertCircle className="h-4 w-4" />}
                    {testState === 'idle' ? 'Testar' : testState === 'testing' ? 'Testando…' : testState === 'ok' ? 'OK!' : 'Falhou'}
                  </button>
                  <button type="button" onClick={handleRemoveN8n}
                    className="flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 className="h-4 w-4" /> Remover
                  </button>
                </>
              )}
            </div>
          </form>
        </Section>

        {/* n8n instructions */}
        {config.n8nWebhookUrl && (
          <Section title="Como configurar o n8n" defaultOpen={false}>
            <div className="space-y-4 text-sm text-gray-700">
              <ol className="space-y-1 text-gray-600 list-decimal list-inside">
                <li><strong>Webhook</strong> — recebe os dados do usuário</li>
                <li><strong>AI Agent / OpenAI</strong> — gera o plano alimentar</li>
                <li><strong>Respond to Webhook</strong> — retorna o plano para o SaaS</li>
              </ol>
              <div className="rounded-xl bg-gray-900 p-4">
                <p className="text-xs text-gray-400 mb-2">Resposta esperada do n8n:</p>
                <pre className="text-xs text-gray-300 overflow-x-auto">{`{
  "dias": [
    {
      "dia": "Segunda-feira",
      "cafe_da_manha": { "nome": "Omelete", "calorias": 320, "proteina": 22, "carbs": 5, "gordura": 18 },
      "lanche":        { "nome": "Iogurte",  "calorias": 150, "proteina": 15, "carbs": 10, "gordura": 3 },
      "almoco":        { "nome": "Frango",   "calorias": 550, "proteina": 45, "carbs": 60, "gordura": 12 },
      "jantar":        { "nome": "Salmão",   "calorias": 400, "proteina": 38, "carbs": 8,  "gordura": 22 }
    }
    // ... 7 dias
  ]
}`}</pre>
              </div>
            </div>
          </Section>
        )}

        {config.savedAt && (
          <p className="text-center text-xs text-gray-600">
            Última alteração: {new Date(config.savedAt).toLocaleString('pt-BR')}
          </p>
        )}
        <p className="text-center text-xs text-gray-700 pb-4">Painel Admin — acesso restrito</p>
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
