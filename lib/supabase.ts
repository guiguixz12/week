import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// ─── Env validation ───────────────────────────────────────────────────────────

// Public keys — safe to hardcode (anon key is designed to be client-side visible).
// Override via NEXT_PUBLIC_SUPABASE_* env vars if needed.
const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL     || 'https://rqoygmqrncayjoqthzje.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxb3lnbXFybmNheWpvcXRoemplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1OTA3OTUsImV4cCI6MjA5NDE2Njc5NX0.hZ6dS0-qRmN36obeDD7Z73K9TdL-q8j-Kj_hvQGXqgg'

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
