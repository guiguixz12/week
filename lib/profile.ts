// ─── Types ────────────────────────────────────────────────────────────────────

export type Sex           = 'masculino' | 'feminino'
export type ActivityLevel = 'sedentario' | 'leve' | 'moderado' | 'intenso' | 'atleta'
export type GoalType      = 'emagrecer' | 'manter' | 'ganhar_massa'
export type DietaryPref   = 'vegetariano' | 'vegano' | 'sem_gluten' | 'sem_lactose' | 'low_carb' | 'cetogenico'

export interface MacroTargets {
  kcal_dia:           number
  proteina_g:         number
  carbs_g:            number
  gordura_g:          number
  editado_manualmente: boolean
}

export interface UserProfile {
  onboarding_done:   boolean
  nome:              string
  sexo:              Sex
  idade:             number
  altura_cm:         number
  peso_atual_kg:     number
  peso_desejado_kg:  number
  nivel_atividade:   ActivityLevel
  objetivo:          GoalType
  preferencias:      DietaryPref[]
  alimentos_nao_gosta: string
  metas:             MacroTargets
  criado_em:         string
  atualizado_em:     string
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

export const PROFILE_KEY        = 'nw_profile'
export const ONBOARDING_STEP_KEY = 'nw_onboarding_step'
export const WIZARD_DATA_KEY    = 'nw_wizard_data'
export const PENDING_PLAN_KEY   = 'nw_pending_plan'

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_METAS: MacroTargets = {
  kcal_dia: 2000, proteina_g: 150, carbs_g: 225, gordura_g: 56,
  editado_manualmente: false,
}

export const DEFAULT_PROFILE: UserProfile = {
  onboarding_done:     false,
  nome:                '',
  sexo:                'masculino',
  idade:               0,
  altura_cm:           0,
  peso_atual_kg:       0,
  peso_desejado_kg:    0,
  nivel_atividade:     'moderado',
  objetivo:            'manter',
  preferencias:        [],
  alimentos_nao_gosta: '',
  metas:               { ...DEFAULT_METAS },
  criado_em:           '',
  atualizado_em:       '',
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

export function getProfile(): UserProfile {
  if (typeof window === 'undefined') return { ...DEFAULT_PROFILE, metas: { ...DEFAULT_METAS } }
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (!raw) return { ...DEFAULT_PROFILE, metas: { ...DEFAULT_METAS } }
    const parsed = JSON.parse(raw) as Partial<UserProfile>
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      metas: { ...DEFAULT_METAS, ...(parsed.metas ?? {}) },
    }
  } catch {
    return { ...DEFAULT_PROFILE, metas: { ...DEFAULT_METAS } }
  }
}

export function saveProfile(updates: Partial<UserProfile>): UserProfile {
  const current = getProfile()
  const now = new Date().toISOString()
  const next: UserProfile = {
    ...current,
    ...updates,
    metas: { ...current.metas, ...(updates.metas ?? {}) },
    atualizado_em: now,
    criado_em: current.criado_em || now,
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(next))
  }
  return next
}

// ─── Calculations ─────────────────────────────────────────────────────────────

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentario: 1.2,
  leve:       1.375,
  moderado:   1.55,
  intenso:    1.725,
  atleta:     1.9,
}

export function calcTMB(peso: number, altura: number, idade: number, sexo: Sex): number {
  if (!peso || !altura || !idade) return 0
  return sexo === 'masculino'
    ? Math.round(88.36 + 13.4 * peso + 4.8 * altura - 5.7 * idade)
    : Math.round(447.6 + 9.2  * peso + 3.1 * altura - 4.3 * idade)
}

export function calcTDEE(tmb: number, atividade: ActivityLevel): number {
  return Math.round(tmb * ACTIVITY_FACTORS[atividade])
}

export function calcGoalKcal(tdee: number, objetivo: GoalType): number {
  if (objetivo === 'emagrecer')    return Math.max(1200, tdee - 500)
  if (objetivo === 'ganhar_massa') return tdee + 300
  return tdee
}

export function calcMacros(
  kcal: number,
  objetivo: GoalType,
  prefs: DietaryPref[],
): Omit<MacroTargets, 'editado_manualmente'> {
  let pProt: number, pCarb: number, pFat: number

  if (prefs.includes('cetogenico')) {
    pProt = 0.25; pCarb = 0.05; pFat = 0.70
  } else if (prefs.includes('low_carb')) {
    pProt = 0.40; pCarb = 0.20; pFat = 0.40
  } else if (objetivo === 'emagrecer') {
    pProt = 0.35; pCarb = 0.40; pFat = 0.25
  } else if (objetivo === 'ganhar_massa') {
    pProt = 0.30; pCarb = 0.50; pFat = 0.20
  } else {
    pProt = 0.30; pCarb = 0.45; pFat = 0.25
  }

  return {
    kcal_dia:   kcal,
    proteina_g: Math.round((kcal * pProt) / 4),
    carbs_g:    Math.round((kcal * pCarb) / 4),
    gordura_g:  Math.round((kcal * pFat)  / 9),
  }
}

export interface CalcResult {
  tmb:      number
  tdee:     number
  kcal_meta: number
  macros:   Omit<MacroTargets, 'editado_manualmente'>
}

export function calcFromProfile(
  p: Pick<UserProfile, 'sexo' | 'idade' | 'altura_cm' | 'peso_atual_kg' | 'nivel_atividade' | 'objetivo' | 'preferencias'>,
): CalcResult {
  const tmb      = calcTMB(p.peso_atual_kg, p.altura_cm, p.idade, p.sexo)
  const tdee     = calcTDEE(tmb, p.nivel_atividade)
  const kcal_meta = calcGoalKcal(tdee, p.objetivo)
  const macros   = calcMacros(kcal_meta, p.objetivo, p.preferencias)
  return { tmb, tdee, kcal_meta, macros }
}

// ─── API helpers ──────────────────────────────────────────────────────────────

export function profileToAPIRestrictions(profile: Pick<UserProfile, 'preferencias' | 'alimentos_nao_gosta'>): string[] {
  const map: Record<DietaryPref, string> = {
    vegetariano: 'vegetariano',
    vegano:      'vegano',
    sem_gluten:  'sem glúten',
    sem_lactose: 'sem lactose',
    low_carb:    'low carb',
    cetogenico:  'cetogênico',
  }
  const list = profile.preferencias.map(p => map[p])
  if (profile.alimentos_nao_gosta.trim()) {
    list.push(`não gosto de: ${profile.alimentos_nao_gosta.trim()}`)
  }
  return list
}
