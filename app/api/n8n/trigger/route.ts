import { NextRequest, NextResponse } from 'next/server'

// ─── Current week Monday ──────────────────────────────────────────────────────

function getCurrentWeekStart(): string {
  const now = new Date()
  const day = now.getDay() // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  return monday.toISOString().split('T')[0]
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL
  if (!webhookUrl) {
    return NextResponse.json(
      { error: 'N8N_WEBHOOK_URL não configurada no servidor.' },
      { status: 503 },
    )
  }

  const body = await req.json()

  // Inject weekStart so n8n knows which week to plan
  const payload = { ...body, weekStart: getCurrentWeekStart() }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 58_000) // 58s (Vercel/Next limit ~60s)

  try {
    const n8nRes = await fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      signal:  controller.signal,
    })
    clearTimeout(timer)

    // n8n may respond with the plan directly (synchronous workflow)
    const contentType = n8nRes.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const data = await n8nRes.json()
      return NextResponse.json({ ok: true, data, weekStart: payload.weekStart })
    }

    return NextResponse.json({ ok: true, weekStart: payload.weekStart })
  } catch (err: unknown) {
    clearTimeout(timer)
    const isTimeout = err instanceof Error && err.name === 'AbortError'
    if (isTimeout) {
      return NextResponse.json(
        { ok: false, timeout: true, weekStart: payload.weekStart },
        { status: 202 },
      )
    }
    console.error('[n8n/trigger]', err)
    return NextResponse.json({ ok: false, error: 'Falha ao contatar n8n.' }, { status: 500 })
  }
}
