import fs from 'fs'
import path from 'path'
import Redis from 'ioredis'

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
  url?: string
  // Optional fields used by integrations (e.g., InflatableOffice sync)
  imageFull?: string
  images?: string[]
  prices?: Record<string, number>
  bookingUrl?: string | null
  source?: string
  sourceId?: string | number
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
  encryptedInflatableOfficeApiKey?: string
  inflatableOfficeLastSyncedAt?: string
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

/** Use Redis when REDIS_URL is present (Vercel production), otherwise fall back to filesystem (local dev) */
function hasRedis(): boolean {
  return !!process.env.REDIS_URL
}

let _redis: Redis | null = null
function getRedis(): Redis {
  if (!_redis) _redis = new Redis(process.env.REDIS_URL!)
  return _redis
}

async function rget<T>(key: string): Promise<T | null> {
  const val = await getRedis().get(key)
  if (!val) return null
  try { return JSON.parse(val) as T } catch { return null }
}

async function rset(key: string, value: unknown): Promise<string | null> {
  const result = await getRedis().set(key, JSON.stringify(value))
  // Debug-only: log key + redis return value (never log secret values)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[redis] SET', key, '=>', result)
  }
  return result
}

async function rsadd(key: string, member: string): Promise<void> {
  await getRedis().sadd(key, member)
}

async function rsmembers(key: string): Promise<string[]> {
  return getRedis().smembers(key)
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
  if (hasRedis()) {
    const fromRedis = await rget<CompanyConfig>(`company:${companyId}:config`)
    if (fromRedis) return fromRedis
  }
  return readFile<CompanyConfig>(path.join(DATA_DIR, companyId, 'config.json'))
}

export async function saveCompanyConfig(config: CompanyConfig): Promise<void> {
  if (hasRedis()) {
    await rset(`company:${config.id}:config`, config)
    await rsadd('companies:all', config.id)
  } else {
    writeFile(path.join(DATA_DIR, config.id, 'config.json'), config)
  }
}

export async function getAllCompanyConfigs(): Promise<CompanyConfig[]> {
  if (hasRedis()) {
    const ids = await rsmembers('companies:all')
    const configs = await Promise.all(ids.map(id => getCompanyConfig(id)))
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
  if (hasRedis()) {
    const ids = await rsmembers('companies:all')
    for (const id of ids) {
      const config = await getCompanyConfig(id)
      if (config?.email?.toLowerCase() === lower) return config
    }
  }
  // Always fall back to filesystem (covers pre-existing accounts)
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
  if (hasRedis()) {
    const fromRedis = await rget<InventoryItem[]>(`company:${companyId}:inventory`)
    if (fromRedis) return fromRedis
  }
  return readFile<InventoryItem[]>(path.join(DATA_DIR, companyId, 'inventory.json')) ?? []
}

export async function saveInventory(companyId: string, items: InventoryItem[]): Promise<void> {
  if (hasRedis()) {
    await rset(`company:${companyId}:inventory`, items)
  } else {
    writeFile(path.join(DATA_DIR, companyId, 'inventory.json'), items)
  }
}

// ── Leads ────────────────────────────────────────────────────────────────────

export async function saveLead(companyId: string, lead: Lead): Promise<void> {
  if (hasRedis()) {
    const existing = await rget<Lead[]>(`company:${companyId}:leads`) ?? []
    await rset(`company:${companyId}:leads`, [lead, ...existing])
  } else {
    const leadsPath = path.join(DATA_DIR, companyId, 'leads.json')
    const existing: Lead[] = readFile<Lead[]>(leadsPath) ?? []
    writeFile(leadsPath, [lead, ...existing])
  }
}

export async function getLeads(companyId: string): Promise<Lead[]> {
  if (hasRedis()) {
    return await rget<Lead[]>(`company:${companyId}:leads`) ?? []
  }
  return readFile<Lead[]>(path.join(DATA_DIR, companyId, 'leads.json')) ?? []
}

// ── Rules ────────────────────────────────────────────────────────────────────

export function applyRules(
  inventory: InventoryItem[],
  rules: Rule[],
  conversationText: string,
  userMessagesOnly?: string
): { activeRules: Rule[]; filteredInventory: InventoryItem[] } {
  // Only trigger rules from user messages, not assistant messages
  const triggerText = (userMessagesOnly ?? conversationText).toLowerCase()

  const activeRules = rules.filter(rule =>
    rule.triggers.some(trigger => triggerText.includes(trigger.toLowerCase()))
  )

  if (activeRules.length === 0) {
    return { activeRules: [], filteredInventory: inventory }
  }

  // Each active rule requires ALL of its requiredTags to be present on an item
  const filteredInventory = inventory.filter(item => {
    const itemTags = item.tags.map(t => t.toLowerCase())
    return activeRules.every(rule =>
      rule.requiredTags.every(required => itemTags.includes(required.toLowerCase()))
    )
  })

  // Conservative fallback: if filtering removes everything, return full inventory
  // but keep the rules active so Claude knows the constraint
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
  const imageIdx    = col(['image', 'photo', 'img', 'picture', 'image_url'])
  const urlIdx      = col(['page_url', 'product_url', 'item_url', 'link', 'webpage', 'website'])

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
      url: urlIdx >= 0 ? cells[urlIdx] || undefined : undefined,
    })
  }

  return items
}
