import fs from 'fs'
import path from 'path'
import { kv } from '@vercel/kv'

export interface InventoryItem {
  id: string
  name: string
  description: string
  price: number
  category: string
  tags: string[]
  ageMin: number
  ageMax: number
  guestCapacity: number
  image: string
}

export type CartMode = 'enabled' | 'inquire' | 'hidden' | 'quote'

export interface Rule {
  name: string
  triggers: string[]
  requiredTags: string[]
  message: string
}

export interface CompanyConfig {
  id: string
  name: string
  tagline: string
  primaryColor: string
  accentColor: string
  navyColor: string
  logoText: string
  allowedOrigins: string[]
  cartMode: CartMode
  cartInquireUrl: string
  rules: Rule[]
  webhookUrl: string
  customInstructions?: string
  yourName?: string
  phone?: string
  email?: string
  passwordHash?: string
  apiProvider?: 'anthropic' | 'openai'
  encryptedApiKey?: string
  encryptedResendKey?: string
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  subscriptionActive?: boolean
}

export interface Lead {
  id: string
  createdAt: string
  firstName: string
  phone: string
  email?: string
  eventDate?: string
  eventDescription: string
  interestedItems: Array<{ name: string; price: number }>
  estimatedValue: number
}

// ── Storage helpers ──────────────────────────────────────────────────────────

const DATA_DIR = path.join(process.cwd(), 'data', 'companies')

/** Use KV when env vars are present (Vercel production), otherwise fall back to filesystem (local dev) */
function hasKV(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

function readFile<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
  } catch {
    return null
  }
}

function writeFile(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
}

// ── Company Config ───────────────────────────────────────────────────────────

export async function getCompanyConfig(companyId: string): Promise<CompanyConfig | null> {
  if (hasKV()) {
    const fromKV = await kv.get<CompanyConfig>(`company:${companyId}:config`)
    if (fromKV) return fromKV
  }
  // Fall back to filesystem for pre-committed data (demo, existing accounts)
  return readFile<CompanyConfig>(path.join(DATA_DIR, companyId, 'config.json'))
}

export async function saveCompanyConfig(config: CompanyConfig): Promise<void> {
  if (hasKV()) {
    await kv.set(`company:${config.id}:config`, config)
    await kv.sadd('companies:all', config.id)
  } else {
    writeFile(path.join(DATA_DIR, config.id, 'config.json'), config)
  }
}

export async function getAllCompanyConfigs(): Promise<CompanyConfig[]> {
  if (hasKV()) {
    const ids = await kv.smembers('companies:all')
    const configs = await Promise.all(ids.map(id => getCompanyConfig(String(id))))
    return configs.filter((c): c is CompanyConfig => c !== null)
  }
  try {
    const dirs = fs.readdirSync(DATA_DIR, { withFileTypes: true })
    const configs = await Promise.all(
      dirs.filter(d => d.isDirectory()).map(d => getCompanyConfig(d.name))
    )
    return configs.filter((c): c is CompanyConfig => c !== null)
  } catch {
    return []
  }
}

export async function findCompanyByEmail(email: string): Promise<CompanyConfig | null> {
  const lower = email.toLowerCase()
  if (hasKV()) {
    // Check KV index first
    const ids = await kv.smembers('companies:all')
    for (const id of ids) {
      const config = await getCompanyConfig(String(id))
      if (config?.email?.toLowerCase() === lower) return config
    }
    // Fall back to filesystem for pre-existing accounts not yet in KV
    try {
      const dirs = fs.readdirSync(DATA_DIR)
      for (const id of dirs) {
        const config = readFile<CompanyConfig>(path.join(DATA_DIR, id, 'config.json'))
        if (config?.email?.toLowerCase() === lower) return config
      }
    } catch { /* ignore */ }
    return null
  }
  // Local dev: scan filesystem
  try {
    const dirs = fs.readdirSync(DATA_DIR)
    for (const id of dirs) {
      const config = readFile<CompanyConfig>(path.join(DATA_DIR, id, 'config.json'))
      if (config?.email?.toLowerCase() === lower) return config
    }
  } catch { /* ignore */ }
  return null
}

// ── Inventory ────────────────────────────────────────────────────────────────

export async function getInventory(companyId: string): Promise<InventoryItem[]> {
  if (hasKV()) {
    const fromKV = await kv.get<InventoryItem[]>(`company:${companyId}:inventory`)
    if (fromKV) return fromKV
  }
  return readFile<InventoryItem[]>(path.join(DATA_DIR, companyId, 'inventory.json')) ?? []
}

export async function saveInventory(companyId: string, items: InventoryItem[]): Promise<void> {
  if (hasKV()) {
    await kv.set(`company:${companyId}:inventory`, items)
  } else {
    writeFile(path.join(DATA_DIR, companyId, 'inventory.json'), items)
  }
}

// ── Leads ────────────────────────────────────────────────────────────────────

export async function saveLead(companyId: string, lead: Lead): Promise<void> {
  if (hasKV()) {
    const existing = await kv.get<Lead[]>(`company:${companyId}:leads`) ?? []
    await kv.set(`company:${companyId}:leads`, [lead, ...existing])
  } else {
    const leadsPath = path.join(DATA_DIR, companyId, 'leads.json')
    const existing: Lead[] = readFile<Lead[]>(leadsPath) ?? []
    writeFile(leadsPath, [lead, ...existing])
  }
}

export async function getLeads(companyId: string): Promise<Lead[]> {
  if (hasKV()) {
    return await kv.get<Lead[]>(`company:${companyId}:leads`) ?? []
  }
  return readFile<Lead[]>(path.join(DATA_DIR, companyId, 'leads.json')) ?? []
}

// ── Rules ────────────────────────────────────────────────────────────────────

export function applyRules(
  inventory: InventoryItem[],
  rules: Rule[],
  conversationText: string
): { activeRules: Rule[]; filteredInventory: InventoryItem[] } {
  const lower = conversationText.toLowerCase()
  const activeRules = rules.filter(rule =>
    rule.triggers.some(trigger => lower.includes(trigger.toLowerCase()))
  )

  if (activeRules.length === 0) {
    return { activeRules: [], filteredInventory: inventory }
  }

  const requiredTags = new Set(activeRules.flatMap(r => r.requiredTags.map(t => t.toLowerCase())))
  const filteredInventory = inventory.filter(item =>
    item.tags.some(tag => requiredTags.has(tag.toLowerCase()))
  )

  if (filteredInventory.length === 0) {
    return { activeRules, filteredInventory: inventory }
  }

  return { activeRules, filteredInventory }
}

// ── CSV Parser ───────────────────────────────────────────────────────────────

function parseCSVRow(line: string): string[] {
  const cells: string[] = []
  let i = 0
  while (i < line.length) {
    if (line[i] === '"') {
      let val = ''
      i++
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') {
          val += '"'; i += 2
        } else if (line[i] === '"') {
          i++; break
        } else {
          val += line[i++]
        }
      }
      cells.push(val.trim())
      if (line[i] === ',') i++
    } else {
      const end = line.indexOf(',', i)
      if (end === -1) {
        cells.push(line.slice(i).trim())
        break
      }
      cells.push(line.slice(i, end).trim())
      i = end + 1
    }
  }
  return cells
}

function splitCSVRows(csv: string): string[] {
  const rows: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i]
    if (ch === '"') inQuotes = !inQuotes
    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && csv[i + 1] === '\n') i++
      if (current.trim()) rows.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) rows.push(current)
  return rows
}

export function parseInventoryCSV(csv: string): InventoryItem[] {
  const rows = splitCSVRows(csv.trim())
  if (rows.length < 2) return []

  const rawHeaders = parseCSVRow(rows[0]).map(h => h.toLowerCase())
  const col = (candidates: string[]): number =>
    rawHeaders.findIndex(h => candidates.some(c => h.includes(c)))

  const nameIdx     = col(['name', 'item', 'product', 'rental', 'title'])
  const descIdx     = col(['description', 'desc', 'details', 'notes', 'about'])
  const priceIdx    = col(['price', 'rate', 'cost', 'amount'])
  const categoryIdx = col(['category', 'type', 'group', 'class'])
  const tagsIdx     = col(['tags', 'keywords', 'labels'])
  const ageMinIdx   = col(['age_min', 'minage', 'min age', 'age min', 'minimum age'])
  const ageMaxIdx   = col(['age_max', 'maxage', 'max age', 'age max', 'maximum age'])
  const capacityIdx = col(['capacity', 'guests', 'max guests', 'guest count', 'max_guests'])
  const imageIdx    = col(['image', 'photo', 'img', 'picture', 'url'])

  const items: InventoryItem[] = []

  for (let i = 1; i < rows.length; i++) {
    const cells = parseCSVRow(rows[i])
    if (cells.every(c => !c)) continue
    const rawPrice = priceIdx >= 0 ? cells[priceIdx].replace(/[$,]/g, '') : '0'
    const name = nameIdx >= 0 ? cells[nameIdx] : `Item ${i}`
    if (!name) continue
    items.push({
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      name,
      description: descIdx >= 0 ? cells[descIdx] : '',
      price: parseFloat(rawPrice) || 0,
      category: categoryIdx >= 0 ? cells[categoryIdx] : 'Other',
      tags: tagsIdx >= 0 ? cells[tagsIdx].split(';').map(t => t.trim()).filter(Boolean) : [],
      ageMin: ageMinIdx >= 0 ? parseInt(cells[ageMinIdx]) || 1 : 1,
      ageMax: ageMaxIdx >= 0 ? parseInt(cells[ageMaxIdx]) || 99 : 99,
      guestCapacity: capacityIdx >= 0 ? parseInt(cells[capacityIdx]) || 50 : 50,
      image: imageIdx >= 0 ? cells[imageIdx] : '',
    })
  }

  return items
}
