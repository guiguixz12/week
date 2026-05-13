import { readFileSync, writeFileSync, existsSync } from 'fs'

interface AdminConfig {
  n8nWebhookUrl: string
  openAiKey:     string
  updatedAt:     string
}

const DEFAULT: AdminConfig = { n8nWebhookUrl: '', openAiKey: '', updatedAt: '' }

let memStore: AdminConfig = { ...DEFAULT }
let loaded = false

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
    // in-memory is the source of truth
  }
}

export function readAdminConfig(): AdminConfig {
  if (!loaded) {
    const fromFile = tryLoadFromFile()
    if (fromFile?.updatedAt) memStore = fromFile
    loaded = true
  }
  return { ...memStore }
}

export function writeAdminConfig(updates: Partial<Omit<AdminConfig, 'updatedAt'>>): AdminConfig {
  readAdminConfig()
  memStore = { ...memStore, ...updates, updatedAt: new Date().toISOString() }
  trySaveToFile(memStore)
  return { ...memStore }
}

// Resolves the OpenAI key: admin panel takes priority over env var
export function getOpenAiKey(): string {
  return readAdminConfig().openAiKey || process.env.OPENAI_API_KEY || ''
}
