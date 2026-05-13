import { NextRequest, NextResponse } from 'next/server'
import { readAdminConfig, writeAdminConfig } from '@/lib/admin-config'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '7808'

function validate(password: string | undefined): boolean {
  return password === ADMIN_PASSWORD
}

function buildConfig() {
  const file         = readAdminConfig()
  const n8nWebhookUrl = file.n8nWebhookUrl || process.env.N8N_WEBHOOK_URL || null
  const hasOpenAi    = !!process.env.OPENAI_API_KEY

  const mode: 'n8n' | 'openai' | 'none' =
    n8nWebhookUrl ? 'n8n' : hasOpenAi ? 'openai' : 'none'

  return { n8nWebhookUrl, openAiConfigured: hasOpenAi, mode, savedAt: file.updatedAt || null }
}

// POST — validate password, return config
export async function POST(req: NextRequest) {
  const { password } = (await req.json()) as { password?: string }
  if (!validate(password)) return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 })
  return NextResponse.json(buildConfig())
}

// PUT — validate password, save n8n URL
export async function PUT(req: NextRequest) {
  const { password, n8nWebhookUrl } = (await req.json()) as { password?: string; n8nWebhookUrl?: string }
  if (!validate(password)) return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 })

  try {
    writeAdminConfig({ n8nWebhookUrl: n8nWebhookUrl ?? '' })
  } catch (err) {
    return NextResponse.json(
      { error: `Erro ao salvar: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true, config: buildConfig() })
}
