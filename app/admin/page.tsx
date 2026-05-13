'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import {
  Lock, Eye, EyeOff, Check, Copy, AlertCircle, CheckCircle2,
  Webhook, Key, Globe, Settings, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Config {
  n8nWebhookUrl:    string | null
  webhookSecret:    string | null
  receivePlanUrl:   string
  appUrl:           string
  n8nConfigured:    boolean
  secretConfigured: boolean
  openAiConfigured: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null)
  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }
  return { copied, copy }
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
      ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
    }`}>
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
      {label}
    </span>
  )
}

function CopyField({ label, value, id, copied, copy, secret = false }: {
  label: string
  value: string | null
  id: string
  copied: string | null
  copy: (text: string, id: string) => void
  secret?: boolean
}) {
  const [revealed, setRevealed] = useState(false)

  if (!value) {
    return (
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
        <div className="flex h-10 items-center rounded-xl border border-dashed border-red-200 bg-red-50 px-4">
          <span className="text-sm text-red-500">Não configurado</span>
        </div>
      </div>
    )
  }

  const display = secret && !revealed ? '•'.repeat(Math.min(value.length, 24)) : value

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
        <span className="flex-1 truncate font-mono text-sm text-gray-800">{display}</span>
        {secret && (
          <button
            onClick={() => setRevealed(r => !r)}
            className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
          >
            {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
        <button
          onClick={() => copy(value, id)}
          className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
        >
          {copied === id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

// ─── Payload examples ─────────────────────────────────────────────────────────

const PAYLOAD_IN = `{
  "userId":        "uuid-do-usuario",
  "email":         "usuario@email.com",
  "nome":          "João Silva",
  "objetivo":      "emagrecer",
  "peso":          85,
  "altura":        175,
  "nivelAtividade": "moderado",
  "restricoes":    ["sem_gluten"],
  "calorias_meta": 1800,
  "proteina_meta": 170,
  "weekStart":     "2026-05-11"
}`

const PAYLOAD_OUT = `{
  "userId":    "uuid-do-usuario",
  "weekStart": "2026-05-11",
  "secret":    "SEU_WEBHOOK_SECRET",
  "dias": [
    {
      "dia": "Segunda-feira",
      "cafe_da_manha": { "nome": "Omelete de ovos", "calorias": 320, "proteina": 22, "carbs": 5,  "gordura": 18 },
      "lanche":        { "nome": "Iogurte grego",   "calorias": 150, "proteina": 15, "carbs": 10, "gordura": 3  },
      "almoco":        { "nome": "Frango c/ arroz",  "calorias": 550, "proteina": 45, "carbs": 60, "gordura": 12 },
      "jantar":        { "nome": "Salmão grelhado",  "calorias": 400, "proteina": 38, "carbs": 8,  "gordura": 22 }
    }
  ]
}`

function CodeBlock({ code, id, copied, copy }: {
  code: string; id: string; copied: string | null; copy: (t: string, i: string) => void
}) {
  return (
    <div className="relative rounded-xl bg-gray-900 p-4">
      <button
        onClick={() => copy(code, id)}
        className="absolute right-3 top-3 flex items-center gap-1 rounded-lg bg-gray-700 px-2.5 py-1 text-xs text-gray-300 hover:bg-gray-600 transition-colors"
      >
        {copied === id ? <><Check className="h-3 w-3 text-green-400" /> Copiado</> : <><Copy className="h-3 w-3" /> Copiar</>}
      </button>
      <pre className="overflow-x-auto text-xs text-gray-300 leading-relaxed pr-20">{code}</pre>
    </div>
  )
}

// ─── Section card ─────────────────────────────────────────────────────────────

function Section({ icon: Icon, title, children, defaultOpen = true }: {
  icon: React.ElementType; title: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-3 px-6 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10">
          <Icon className="h-4 w-4 text-brand" />
        </div>
        <span className="flex-1 font-semibold text-gray-900">{title}</span>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {open && <div className="border-t border-gray-100 px-6 py-5 space-y-5">{children}</div>}
    </div>
  )
}

// ─── Login screen ─────────────────────────────────────────────────────────────

function LoginScreen({ onAuth }: { onAuth: (pwd: string) => void }) {
  const [pwd, setPwd]     = useState('')
  const [show, setShow]   = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/admin/config', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ password: pwd }),
    })
    if (res.ok) {
      onAuth(pwd)
    } else {
      setError('Senha incorreta.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 p-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/20">
            <Lock className="h-8 w-8 text-brand" />
          </div>
          <h1 className="text-2xl font-bold text-white">Painel Admin</h1>
          <p className="text-sm text-gray-400">Acesso restrito. Insira a senha para continuar.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={pwd}
              onChange={e => setPwd(e.target.value)}
              placeholder="Senha"
              autoFocus
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 pr-12 text-white placeholder:text-gray-500 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
            <button type="button" onClick={() => setShow(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {error && (
            <p className="flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4" /> {error}
            </p>
          )}

          <button type="submit"
            className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors">
            Entrar
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
  const [testState, setTestState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const { copied, copy } = useCopy()

  const loadConfig = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/config', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ password }),
    })
    if (res.ok) setConfig(await res.json())
    setLoading(false)
  }, [password])

  useEffect(() => { loadConfig() }, [loadConfig])

  async function testWebhook() {
    if (!config?.n8nWebhookUrl) return
    setTestState('loading')
    try {
      const res = await fetch('/api/n8n/trigger', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          userId:        'test-admin',
          email:         'admin@test.com',
          nome:          'Teste Admin',
          objetivo:      'manter',
          peso:          75,
          altura:        175,
          nivelAtividade: 'moderado',
          restricoes:    [],
          calorias_meta: 2000,
          proteina_meta: 150,
        }),
      })
      setTestState(res.ok || res.status === 202 ? 'ok' : 'error')
    } catch {
      setTestState('error')
    }
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

  const payloadOutWithSecret = PAYLOAD_OUT.replace(
    '"SEU_WEBHOOK_SECRET"',
    config.webhookSecret ? `"${config.webhookSecret}"` : '"SUA_SENHA_AQUI"',
  )

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="mx-auto max-w-3xl space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Painel Admin</h1>
            <p className="text-sm text-gray-400">Configurações internas — acesso restrito</p>
          </div>
          <button onClick={loadConfig}
            className="flex items-center gap-2 rounded-xl bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors">
            <RefreshCw className="h-4 w-4" /> Atualizar
          </button>
        </div>

        {/* Status cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'n8n',        ok: config.n8nConfigured,    icon: Webhook },
            { label: 'Secret',     ok: config.secretConfigured, icon: Key },
            { label: 'OpenAI',     ok: config.openAiConfigured, icon: Settings },
          ].map(({ label, ok, icon: Icon }) => (
            <div key={label} className="rounded-2xl bg-gray-900 p-4 text-center ring-1 ring-gray-800">
              <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl ${ok ? 'bg-green-900/50' : 'bg-red-900/30'}`}>
                <Icon className={`h-5 w-5 ${ok ? 'text-green-400' : 'text-red-400'}`} />
              </div>
              <p className="text-xs font-semibold text-gray-400">{label}</p>
              <StatusBadge ok={ok} label={ok ? 'OK' : 'Faltando'} />
            </div>
          ))}
        </div>

        {/* n8n Configuration */}
        <Section icon={Webhook} title="Configuração n8n">
          <CopyField label="URL do Webhook n8n (o SaaS chama esta URL)"
            value={config.n8nWebhookUrl} id="n8n-url" copied={copied} copy={copy} />

          <CopyField label="URL de Retorno (n8n chama esta URL com o plano)"
            value={config.receivePlanUrl} id="receive-url" copied={copied} copy={copy} />

          <CopyField label="Secret de Segurança (enviar no header X-Webhook-Secret)"
            value={config.webhookSecret} id="secret" copied={copied} copy={copy} secret />

          <div className="pt-1">
            <button
              onClick={testWebhook}
              disabled={!config.n8nConfigured || testState === 'loading'}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                testState === 'ok'    ? 'bg-green-600 text-white' :
                testState === 'error' ? 'bg-red-600 text-white'   :
                'bg-brand text-white hover:bg-brand-600 disabled:opacity-40'
              }`}
            >
              {testState === 'loading' && <RefreshCw className="h-4 w-4 animate-spin" />}
              {testState === 'ok'      && <CheckCircle2 className="h-4 w-4" />}
              {testState === 'error'   && <AlertCircle className="h-4 w-4" />}
              {testState === 'idle'    ? 'Testar conexão com n8n' :
               testState === 'loading' ? 'Testando…' :
               testState === 'ok'     ? 'n8n respondeu OK' : 'Falha na conexão'}
            </button>
            {!config.n8nConfigured && (
              <p className="mt-2 text-xs text-red-400">Configure N8N_WEBHOOK_URL no EasyPanel para habilitar o teste.</p>
            )}
          </div>
        </Section>

        {/* Payload: SaaS → n8n */}
        <Section icon={Globe} title="Payload enviado ao n8n (SaaS → n8n)" defaultOpen={false}>
          <p className="text-sm text-gray-600">
            Quando o usuário conclui o onboarding, o SaaS envia este JSON para o webhook do n8n:
          </p>
          <CodeBlock code={PAYLOAD_IN} id="payload-in" copied={copied} copy={copy} />
        </Section>

        {/* Payload: n8n → SaaS */}
        <Section icon={Globe} title="Payload esperado do n8n (n8n → SaaS)" defaultOpen={false}>
          <p className="text-sm text-gray-600">
            O n8n deve enviar o plano para <span className="font-mono text-brand">POST /api/webhook/receive-plan</span>.
            Inclua o secret no body ou no header <span className="font-mono text-brand">X-Webhook-Secret</span>:
          </p>
          <CodeBlock code={payloadOutWithSecret} id="payload-out" copied={copied} copy={copy} />
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-700">
            <strong>Dica n8n:</strong> No nó <em>HTTP Request</em>, coloque a URL de retorno acima,
            método POST, body em JSON. Para sincronizar, use o nó <em>Respond to Webhook</em> no final
            do fluxo (resposta imediata) — ou chame o endpoint de retorno separadamente (assíncrono).
          </div>
        </Section>

        {/* EasyPanel env vars */}
        <Section icon={Key} title="Variáveis de ambiente (EasyPanel)" defaultOpen={false}>
          <p className="text-sm text-gray-600">Configure estas variáveis na aba <strong>Ambiente</strong> do EasyPanel:</p>
          <CodeBlock
            code={[
              'N8N_WEBHOOK_URL=https://seu-n8n.dominio.com/webhook/nutriweek-plan',
              'WEBHOOK_SECRET=senha-para-n8n-autenticar',
              'OPENAI_API_KEY=sk-...',
              '',
              '# Senha deste painel admin (padrão: 7808)',
              'ADMIN_PASSWORD=7808',
            ].join('\n')}
            id="env-vars" copied={copied} copy={copy}
          />
        </Section>

        <p className="text-center text-xs text-gray-600 pb-4">
          Painel Admin — NutriWeek · acesso restrito
        </p>
      </div>
    </div>
  )
}

// ─── Root page ────────────────────────────────────────────────────────────────

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
