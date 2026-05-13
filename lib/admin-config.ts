import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, existsSync } from 'fs'

interface AdminConfig {
  n8nWebhookUrl: string
  openAiKey:     string
  updatedAt:     string
}

const DEFAULT: AdminConfig = { n8nWebhookUrl: '', openAiKey: '', updatedAt: '' }

// ─── In-memory cache ──────────────────────────────────────────────────────────

let memStore: AdminConfig = { ...DEFAULT }
let loaded = false

// ─── Supabase service client (server-side only) ───────────────────────────────

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────

async function loadFromSupabase(): Promise<Partial<AdminConfig>> {
  try {
    const sb = getServiceClient()
    if (!sb) return {}
    const { data } = await sb.from('app_config').select('key, value')
    if (!data) return {}
    const result: Partial<AdminConfig> = {}
    for (const row of data) {
      if (row.key === 'openAiKey')     result.openAiKey     = row.value
      if (row.key === 'n8nWebhookUrl') result.n8nWebhookUrl = row.value
      if (row.key === 'updatedAt')     result.updatedAt     = row.value
    }
    return result
  } catch {
    return {}
  }
}

async function saveToSupabase(config: AdminConfig): Promise<void> {
  try {
    const sb = getServiceClient()
    if (!sb) return
    const rows = [
      { key: 'openAiKey',     value: config.openAiKey,     updated_at: new Date().toISOString() },
      { key: 'n8nWebhookUrl', value: config.n8nWebhookUrl, updated_at: new Date().toISOString() },
      { key: 'updatedAt',     value: config.updatedAt,     updated_at: new Date().toISOString() },
    ]
    await sb.from('app_config').upsert(rows, { onConflict: 'key' })
  } catch { /* non-critical */ }
}

// ─── File fallback (in case Supabase is unavailable) ─────────────────────────

const BACKUP_PATH = '/tmp/nw-config.json'

function tryLoadFromFile(): Partial<AdminConfig> {
  try {
    if (!existsSync(BACKUP_PATH)) return {}
    return JSON.parse(readFileSync(BACKUP_PATH, 'utf-8')) as AdminConfig
  } catch {
    return {}
  }
}

function trySaveToFile(config: AdminConfig): void {
  try {
    writeFileSync(BACKUP_PATH, JSON.stringify(config, null, 2), 'utf-8')
  } catch { /* non-critical */ }
}

// ─── Public API (sync, for backwards compat with existing callers) ────────────

export function readAdminConfig(): AdminConfig {
  if (!loaded) {
    const fromFile = tryLoadFromFile()
    if (fromFile?.updatedAt) memStore = { ...DEFAULT, ...fromFile }
    loaded = true
    // Kick off async Supabase load — will hydrate memStore for subsequent calls
    loadFromSupabase().then(fromDb => {
      if (fromDb?.updatedAt && fromDb.updatedAt > (memStore.updatedAt ?? '')) {
        memStore = { ...memStore, ...fromDb }
        trySaveToFile(memStore)
      }
    }).catch(() => { /* non-critical */ })
  }
  return { ...memStore }
}

export function writeAdminConfig(updates: Partial<Omit<AdminConfig, 'updatedAt'>>): AdminConfig {
  readAdminConfig()
  memStore = { ...memStore, ...updates, updatedAt: new Date().toISOString() }
  trySaveToFile(memStore)
  saveToSupabase(memStore).catch(() => { /* non-critical */ })
  return { ...memStore }
}

// ─── Async version for fresh reads (used in API routes that can await) ────────

export async function readAdminConfigAsync(): Promise<AdminConfig> {
  const fromDb = await loadFromSupabase()
  if (fromDb?.updatedAt) {
    memStore = { ...DEFAULT, ...fromDb }
    trySaveToFile(memStore)
    loaded = true
  } else if (!loaded) {
    readAdminConfig()
  }
  return { ...memStore }
}

// ─── OpenAI key resolver ──────────────────────────────────────────────────────

export function getOpenAiKey(): string {
  return readAdminConfig().openAiKey || process.env.OPENAI_API_KEY || ''
}

export async function getOpenAiKeyAsync(): Promise<string> {
  const config = await readAdminConfigAsync()
  return config.openAiKey || process.env.OPENAI_API_KEY || ''
}
