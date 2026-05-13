import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

// Persiste em /app/nw-config.json no container (sobrevive enquanto o processo roda)
const CONFIG_PATH = join(process.cwd(), 'nw-config.json')

interface AdminConfig {
  n8nWebhookUrl: string
  webhookSecret: string
  updatedAt: string
}

const DEFAULT: AdminConfig = { n8nWebhookUrl: '', webhookSecret: '', updatedAt: '' }

export function readAdminConfig(): AdminConfig {
  try {
    if (!existsSync(CONFIG_PATH)) return { ...DEFAULT }
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) as AdminConfig
  } catch {
    return { ...DEFAULT }
  }
}

export function writeAdminConfig(updates: Partial<Omit<AdminConfig, 'updatedAt'>>): AdminConfig {
  const current = readAdminConfig()
  const next: AdminConfig = { ...current, ...updates, updatedAt: new Date().toISOString() }
  writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2), 'utf-8')
  return next
}
