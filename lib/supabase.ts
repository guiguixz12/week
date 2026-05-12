import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// ─── Env validation ───────────────────────────────────────────────────────────

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase env vars not set. Add NEXT_PUBLIC_SUPABASE_URL and ' +
    'NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local'
  )
}

// ─── Typed browser client (singleton — use in Client Components) ──────────────
// Type is inferred as SupabaseClient<Database, 'public', Database['public']>

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: true,
  },
})

// ─── Server-side factory (Server Components / Route Handlers) ─────────────────
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (never expose to browser).
// This client bypasses RLS — use only in trusted server-side code.

export function createServerClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  return createClient<Database>(supabaseUrl!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// ─── Re-export type helpers ───────────────────────────────────────────────────

export type { Database, Tables, TablesInsert, TablesUpdate } from '@/types/database'
