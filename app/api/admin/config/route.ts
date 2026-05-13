import { NextRequest, NextResponse } from 'next/server'
import { readAdminConfigAsync, writeAdminConfig } from '@/lib/admin-config'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '7808'

function validate(p: string | undefined) { return p === ADMIN_PASSWORD }

async function buildConfig() {
  const file          = await readAdminConfigAsync()
  const n8nWebhookUrl = file.n8nWebhookUrl || process.env.N8N_WEBHOOK_URL || null
  const openAiKey     = file.openAiKey || process.env.OPENAI_API_KEY || ''
  const openAiSource  = file.openAiKey ? 'admin' : (process.env.OPENAI_API_KEY ? 'env' : null)

  const mode: 'n8n' | 'openai' | 'none' =
    n8nWebhookUrl ? 'n8n' : openAiKey ? 'openai' : 'none'

  return {
    n8nWebhookUrl,
    openAiConfigured: !!openAiKey,
    openAiSource,
    openAiKeyMasked: openAiKey ? `sk-...${openAiKey.slice(-4)}` : null,
    mode,
    savedAt: file.updatedAt || null,
  }
}

export async function POST(req: NextRequest) {
  const { password } = (await req.json()) as { password?: string }
  if (!validate(password)) return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 })
  return NextResponse.json(await buildConfig())
}

export async function PUT(req: NextRequest) {
  const body = (await req.json()) as { password?: string; n8nWebhookUrl?: string; openAiKey?: string }
  if (!validate(body.password)) return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 })

  try {
    const updates: Record<string, string> = {}
    if (body.n8nWebhookUrl !== undefined) updates.n8nWebhookUrl = body.n8nWebhookUrl
    if (body.openAiKey     !== undefined) updates.openAiKey     = body.openAiKey
    writeAdminConfig(updates)
  } catch (err) {
    return NextResponse.json(
      { error: `Erro ao salvar: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true, config: await buildConfig() })
}
