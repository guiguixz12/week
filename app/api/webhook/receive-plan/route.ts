import { NextRequest, NextResponse } from 'next/server'
import { storePendingPlan, getPendingPlan, diasToWeekPlan } from '@/lib/pending-plans'
import type { WeekPlan } from '@/types'

// ─── POST: n8n calls this to deliver the generated plan ──────────────────────
//
// Expected body (option A — full WeekPlan):
//   { "userId": "...", "plan": { <WeekPlan> }, "secret": "..." }
//
// Expected body (option B — simple "dias" format):
//   { "userId": "...", "weekStart": "YYYY-MM-DD", "dias": [ ... ], "secret": "..." }
//
// Secure with WEBHOOK_SECRET env var (optional but recommended).
// In n8n: add header  X-Webhook-Secret: <your-secret>
//         or include secret in body

export async function POST(req: NextRequest) {
  // Optional secret validation (file config takes priority over env var)
  const expectedSecret = process.env.WEBHOOK_SECRET || ''
  if (expectedSecret) {
    const headerSecret = req.headers.get('x-webhook-secret') ?? ''
    const body = await req.json() as Record<string, unknown>
    const bodySecret = (body.secret as string) ?? ''
    if (headerSecret !== expectedSecret && bodySecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return handleBody(body)
  }

  const body = await req.json() as Record<string, unknown>
  return handleBody(body)
}

function handleBody(body: Record<string, unknown>) {
  const userId = body.userId as string | undefined
  if (!userId) {
    return NextResponse.json({ error: 'userId é obrigatório.' }, { status: 400 })
  }

  let plan: WeekPlan | null = null

  // Option A: full WeekPlan
  if (body.plan && typeof body.plan === 'object') {
    plan = body.plan as WeekPlan
  }
  // Option B: "dias" format (same as generate-plan API)
  else if (Array.isArray(body.dias) && body.weekStart) {
    plan = diasToWeekPlan(userId, body.weekStart as string, body.dias)
  }

  if (!plan) {
    return NextResponse.json({ error: 'Forneça "plan" (WeekPlan) ou "dias" + "weekStart".' }, { status: 400 })
  }

  storePendingPlan(userId, plan)
  console.log(`[webhook/receive-plan] Plano armazenado para userId=${userId}`)

  return NextResponse.json({ ok: true })
}

// ─── GET: frontend polls to check if plan has arrived ────────────────────────
//
// GET /api/webhook/receive-plan?userId=<uuid>
// Returns: { plan: WeekPlan | null }

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ plan: null })
  }

  const plan = getPendingPlan(userId)
  return NextResponse.json({ plan })
}
