import { NextRequest, NextResponse } from 'next/server'
import { readAdminConfig, writeAdminConfig } from '@/lib/admin-config'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '7808'

function validate(password: string | undefined): boolean {
  return password === ADMIN_PASSWORD
}

function buildConfig(req: NextRequest) {
  const host   = req.headers.get('host') ?? 'localhost:3000'
  const proto  = host.startsWith('localhost') ? 'http' : 'https'
  const appUrl = `${proto}://${host}`

  const fileConfig = readAdminConfig()

  // File config takes priority over env vars
  const n8nWebhookUrl = fileConfig.n8nWebhookUrl || process.env.N8N_WEBHOOK_URL || null
  const webhookSecret = fileConfig.webhookSecret  || process.env.WEBHOOK_SECRET  || null

  return {
    n8nWebhookUrl,
    webhookSecret,
    receivePlanUrl:   `${appUrl}/api/webhook/receive-plan`,
    appUrl,
    n8nConfigured:    !!n8nWebhookUrl,
    secretConfigured: !!webhookSecret,
    openAiConfigured: !!process.env.OPENAI_API_KEY,
    savedAt:          fileConfig.updatedAt || null,
  }
}

// POST — validate password and return config
export async function POST(req: NextRequest) {
  const body = (await req.json()) as { password?: string }
  if (!validate(body.password)) {
    return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 })
  }
  return NextResponse.json(buildConfig(req))
}

// PUT — validate password and save new config values
export async function PUT(req: NextRequest) {
  const body = (await req.json()) as {
    password?: string
    n8nWebhookUrl?: string
    webhookSecret?: string
  }

  if (!validate(body.password)) {
    return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 })
  }

  try {
    writeAdminConfig({
      n8nWebhookUrl: body.n8nWebhookUrl ?? '',
      webhookSecret: body.webhookSecret ?? '',
    })
  } catch (err) {
    console.error('[admin/config PUT]', err)
    return NextResponse.json(
      { error: `Erro ao salvar: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true, config: buildConfig(req) })
}
