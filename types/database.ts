// ─── Domain enums ─────────────────────────────────────────────────────────────

export type Objetivo     = 'emagrecer' | 'manter' | 'ganhar_massa'
export type TipoRefeicao = 'breakfast' | 'snack'  | 'lunch' | 'dinner'

// ─── JSONB sub-type ───────────────────────────────────────────────────────────

export type Ingrediente = {
  nome:       string
  quantidade: number
  unidade:    'g' | 'ml' | 'unidade' | 'colher' | 'xícara' | string
}

// ─── Row types (mirror DB columns exactly — snake_case) ───────────────────────
// Must be `type` aliases (not `interface`) so they satisfy Record<string, unknown>
// in conditional types used by @supabase/postgrest-js.

export type UserRow = {
  id:            string
  email:         string
  nome:          string
  peso:          number | null   // kg  (numeric 5,2)
  altura:        number | null   // cm
  objetivo:      Objetivo | null
  calorias_meta: number | null   // kcal/dia
  proteina_meta: number | null   // g/dia
  created_at:    string
  updated_at:    string
}

export type WeeklyPlanRow = {
  id:            string
  user_id:       string
  semana_inicio: string          // date ISO — always a Monday
  created_at:    string
}

export type MealSlotRow = {
  id:            string
  plan_id:       string
  dia_semana:    number          // 0–6  (0 = Segunda-feira)
  tipo_refeicao: TipoRefeicao
  nome:          string
  calorias:      number
  proteina:      number          // g
  carbs:         number          // g
  gordura:       number          // g
  custo:         number | null   // BRL
}

export type RecipeRow = {
  id:            string
  user_id:       string
  nome:          string
  descricao:     string | null
  calorias:      number
  proteina:      number
  carbs:         number
  gordura:       number
  ingredientes:  Ingrediente[]   // jsonb
  modo_preparo:  string | null
  tempo_preparo: number | null   // minutos
  porcoes:       number | null
  created_at:    string
  updated_at:    string
}

// ─── Database type — must match exactly the format @supabase/postgrest-js expects
// GenericSchema = { Tables: Record<string, GenericTable>; Views: ...; Functions: ... }
// GenericTable  = { Row: Record<string,unknown>; Insert: ...; Update: ...; Relationships: ... }

export type Database = {
  public: {
    Tables: {
      users: {
        Row: UserRow
        Insert: {
          id:             string
          email:          string
          nome:           string
          peso?:          number | null
          altura?:        number | null
          objetivo?:      Objetivo | null
          calorias_meta?: number | null
          proteina_meta?: number | null
          created_at?:    string
          updated_at?:    string
        }
        Update: {
          email?:         string
          nome?:          string
          peso?:          number | null
          altura?:        number | null
          objetivo?:      Objetivo | null
          calorias_meta?: number | null
          proteina_meta?: number | null
          updated_at?:    string
        }
        Relationships: []
      }
      weekly_plans: {
        Row: WeeklyPlanRow
        Insert: {
          id?:           string
          user_id:       string
          semana_inicio: string
          created_at?:   string
        }
        Update: {
          semana_inicio?: string
        }
        Relationships: []
      }
      meal_slots: {
        Row: MealSlotRow
        Insert: {
          id?:           string
          plan_id:       string
          dia_semana:    number
          tipo_refeicao: TipoRefeicao
          nome:          string
          calorias:      number
          proteina:      number
          carbs:         number
          gordura:       number
          custo?:        number | null
        }
        Update: {
          nome?:         string
          calorias?:     number
          proteina?:     number
          carbs?:        number
          gordura?:      number
          custo?:        number | null
        }
        Relationships: []
      }
      recipes: {
        Row: RecipeRow
        Insert: {
          id?:            string
          user_id:        string
          nome:           string
          descricao?:     string | null
          calorias:       number
          proteina:       number
          carbs:          number
          gordura:        number
          ingredientes?:  Ingrediente[]
          modo_preparo?:  string | null
          tempo_preparo?: number | null
          porcoes?:       number | null
          created_at?:    string
          updated_at?:    string
        }
        Update: {
          nome?:          string
          descricao?:     string | null
          calorias?:      number
          proteina?:      number
          carbs?:         number
          gordura?:       number
          ingredientes?:  Ingrediente[]
          modo_preparo?:  string | null
          tempo_preparo?: number | null
          porcoes?:       number | null
          updated_at?:    string
        }
        Relationships: []
      }
    }
    Views:          { [_ in never]: never }
    Functions:      { [_ in never]: never }
    Enums: {
      objetivo:      Objetivo
      tipo_refeicao: TipoRefeicao
    }
    CompositeTypes: { [_ in never]: never }
  }
}

// ─── Convenience type helpers ─────────────────────────────────────────────────

/** Tipo Row de qualquer tabela:  Tables<'users'> */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

/** Tipo Insert de qualquer tabela */
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

/** Tipo Update de qualquer tabela */
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

// ─── Standalone insert/update aliases (usados em lib/db.ts) ──────────────────

export type UserUpdate       = Database['public']['Tables']['users']['Update']
export type WeeklyPlanInsert = Database['public']['Tables']['weekly_plans']['Insert']
export type MealSlotInsert   = Database['public']['Tables']['meal_slots']['Insert']
export type MealSlotUpdate   = Database['public']['Tables']['meal_slots']['Update']
export type RecipeInsert     = Database['public']['Tables']['recipes']['Insert']
export type RecipeUpdate     = Database['public']['Tables']['recipes']['Update']
