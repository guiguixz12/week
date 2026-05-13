import { readFileSync, writeFileSync, existsSync } from 'fs'

// ─── In-memory store (primary) ────────────────────────────────────────────────
// Persiste enquanto o processo Node.js está rodando.
// Sem problemas de permissão de arquivo.

interface AdminConfig {
  n8nWebhookUrl: string
  webhookSecret: string
  updatedAt: string
}

const DEFAULT: AdminConfig = { n8nWebhookUrl: '', webhookSecret: '', updatedAt: '' }

// Módulo-level — sobrevive a múltiplas requisições no mesmo processo
let memStore: AdminConfig = { ...DEFAULT }
let loaded = false

// ─── File backup (secondary) ──────────────────────────────────────────────────
// Tentamos /tmp para persistir entre cold-starts sem reiniciar o processo.

const BACKUP_PATH = '/tmp/nw-config.json'

function tryLoadFromFile(): AdminConfig | null {
  try {
    if (!existsSync(BACKUP_PATH)) return null
    return JSON.parse(readFileSync(BACKUP_PATH, 'utf-8')) as AdminConfig
  } catch {
    return null
  }
}

function trySaveToFile(config: AdminConfig): void {
  try {
    writeFileSync(BACKUP_PATH, JSON.stringify(config, null, 2), 'utf-8')
  } catch {
    // silently ignore — in-memory store is the source of truth
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function readAdminConfig(): AdminConfig {
  if (!loaded) {
    const fromFile = tryLoadFromFile()
    if (fromFile?.updatedAt) memStore = fromFile
    loaded = true
  }
  return { ...memStore }
}

export function writeAdminConfig(updates: Partial<Omit<AdminConfig, 'updatedAt'>>): AdminConfig {
  readAdminConfig() // ensure loaded
  memStore = { ...memStore, ...updates, updatedAt: new Date().toISOString() }
  trySaveToFile(memStore)
  return { ...memStore }
}
