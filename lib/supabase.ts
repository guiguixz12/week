import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// ─── Env validation ───────────────────────────────────────────────────────────

// Fallback to placeholder so the module loads at build time without throwing.
// At runtime, a missing/wrong URL causes API calls to fail gracefully (pages
// fall back to demo data). Set the real values in your environment.
const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL     || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('[supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.')
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
