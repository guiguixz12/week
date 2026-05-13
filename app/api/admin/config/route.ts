import { NextRequest, NextResponse } from 'next/server'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '7808'

export async function POST(req: NextRequest) {
  const { password } = (await req.json()) as { password?: string }

  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 })
  }

  const host = req.headers.get('host') ?? 'localhost:3000'
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  const appUrl = `${proto}://${host}`

  return NextResponse.json({
    n8nWebhookUrl:        process.env.N8N_WEBHOOK_URL           ?? null,
    webhookSecret:        process.env.WEBHOOK_SECRET             ?? null,
    receivePlanUrl:       `${appUrl}/api/webhook/receive-plan`,
    appUrl,
    n8nConfigured:        !!process.env.N8N_WEBHOOK_URL,
    secretConfigured:     !!process.env.WEBHOOK_SECRET,
    openAiConfigured:     !!process.env.OPENAI_API_KEY,
  })
}
