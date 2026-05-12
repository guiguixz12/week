import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeneratePlanRequest {
  objetivo: 'emagrecer' | 'manter' | 'ganhar_massa'
  calorias_meta: number
  proteina_meta: number
  restricoes?: string[]
  preferencias?: string[]
}

interface Meal {
  nome: string
  calorias: number
  proteina: number
  carbs: number
  gordura: number
  ingredientes: string[]
}

interface DayPlan {
  dia: string
  cafe_da_manha: Meal
  lanche: Meal
  almoco: Meal
  jantar: Meal
}

interface WeeklyPlan {
  dias: DayPlan[]
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(body: GeneratePlanRequest): string {
  const objetivoLabel = {
    emagrecer:     'emagrecimento (déficit calórico)',
    manter:        'manutenção de peso',
    ganhar_massa:  'ganho de massa muscular (superávit calórico)',
  }[body.objetivo]

  const restricoesText = body.restricoes?.length
    ? `Restrições alimentares: ${body.restricoes.join(', ')}.`
    : 'Sem restrições alimentares.'

  const preferenciasText = body.preferencias?.length
    ? `Preferências: ${body.preferencias.join(', ')}.`
    : ''

  return `Você é um nutricionista especializado em planejamento alimentar semanal.

Crie um plano alimentar semanal completo para um usuário com as seguintes características:
- Objetivo: ${objetivoLabel}
- Meta calórica diária: ${body.calorias_meta} kcal
- Meta de proteína diária: ${body.proteina_meta}g
- ${restricoesText}
- ${preferenciasText}

Retorne SOMENTE um JSON válido, sem explicações, sem markdown, sem blocos de código.
O JSON deve seguir exatamente esta estrutura:

{
  "dias": [
    {
      "dia": "Segunda-feira",
      "cafe_da_manha": {
        "nome": "Nome da refeição",
        "calorias": 350,
        "proteina": 20,
        "carbs": 40,
        "gordura": 10,
        "ingredientes": ["ingrediente 1", "ingrediente 2"]
      },
      "lanche": { ... },
      "almoco": { ... },
      "jantar": { ... }
    }
  ]
}

Regras:
- Inclua os 7 dias da semana (Segunda a Domingo)
- As calorias de cada dia devem somar aproximadamente ${body.calorias_meta} kcal (±100 kcal)
- A proteína total diária deve ser próxima de ${body.proteina_meta}g
- Use alimentos típicos brasileiros, práticos e acessíveis
- Os ingredientes devem ser listados de forma simples (ex: "100g de frango grelhado", "1 banana")
- Varie as refeições ao longo da semana para não repetir o mesmo prato em dias seguidos
- Retorne apenas o JSON puro, sem nenhum texto adicional`
}

// ─── JSON extractor ───────────────────────────────────────────────────────────

function extractJSON(text: string): WeeklyPlan {
  const trimmed = text.trim()

  // Strip markdown code fences if Claude wraps it anyway
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenceMatch ? fenceMatch[1].trim() : trimmed

  const parsed = JSON.parse(raw) as WeeklyPlan

  if (!Array.isArray(parsed.dias) || parsed.dias.length !== 7) {
    throw new Error('Plano gerado inválido: esperado 7 dias.')
  }

  return parsed
}

// ─── Route handler ────────────────────────────────────────────────────────────

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GeneratePlanRequest

    if (!body.objetivo || !body.calorias_meta || !body.proteina_meta) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios ausentes: objetivo, calorias_meta, proteina_meta.' },
        { status: 400 },
      )
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: buildPrompt(body),
        },
      ],
    })

    const textBlock = message.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('Resposta inesperada da API: nenhum bloco de texto.')
    }

    const plan = extractJSON(textBlock.text)

    return NextResponse.json({ plan })
  } catch (err: unknown) {
    const isAnthropicError = err instanceof Error && err.constructor.name.includes('Anthropic')
    const message =
      err instanceof SyntaxError
        ? 'Erro ao interpretar o plano gerado. Tente novamente.'
        : isAnthropicError
          ? 'Erro na comunicação com a IA. Verifique a chave de API.'
          : err instanceof Error
            ? err.message
            : 'Erro desconhecido.'

    console.error('[generate-plan]', err)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
