import fs from 'fs'
import path from 'path'

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

export type CartMode = 'enabled' | 'inquire' | 'hidden'

export interface Rule {
  name: string
  triggers: string[]      // keywords to detect in user messages
  requiredTags: string[]  // inventory items must have ALL of these tags
  message: string         // shown to customer explaining the filter
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
  cartInquireUrl: string   // used when cartMode = 'inquire'
  rules: Rule[]
  webhookUrl: string       // GHL (or any) inbound webhook URL for lead capture
}

const DATA_DIR = path.join(process.cwd(), 'data', 'companies')

export function getCompanyConfig(companyId: string): CompanyConfig | null {
  try {
    const configPath = path.join(DATA_DIR, companyId, 'config.json')
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'))
  } catch {
    return null
  }
}

export function getInventory(companyId: string): InventoryItem[] {
  try {
    const inventoryPath = path.join(DATA_DIR, companyId, 'inventory.json')
    return JSON.parse(fs.readFileSync(inventoryPath, 'utf-8'))
  } catch {
    return []
  }
}

export function saveInventory(companyId: string, items: InventoryItem[]): void {
  const dir = path.join(DATA_DIR, companyId)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'inventory.json'), JSON.stringify(items, null, 2))
}

export function saveCompanyConfig(config: CompanyConfig): void {
  const dir = path.join(DATA_DIR, config.id)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify(config, null, 2))
}

/**
 * Detect which rules are triggered by the conversation text.
 * Returns the matched rules and the filtered inventory.
 */
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

  // Collect all required tags across active rules
  const requiredTags = new Set(activeRules.flatMap(r => r.requiredTags.map(t => t.toLowerCase())))

  const filteredInventory = inventory.filter(item =>
    item.tags.some(tag => requiredTags.has(tag.toLowerCase()))
  )

  // If filtering would remove everything, fall back to full inventory
  if (filteredInventory.length === 0) {
    return { activeRules, filteredInventory: inventory }
  }

  return { activeRules, filteredInventory }
}

export function listCompanies(): string[] {
  try {
    return fs.readdirSync(DATA_DIR)
  } catch {
    return []
  }
}

/**
 * RFC 4180-compliant CSV row parser.
 * Handles quoted fields, commas inside quotes, and escaped double-quotes ("").
 */
function parseCSVRow(line: string): string[] {
  const cells: string[] = []
  let i = 0
  while (i < line.length) {
    if (line[i] === '"') {
      // Quoted field
      let val = ''
      i++ // skip opening quote
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') {
          val += '"'; i += 2
        } else if (line[i] === '"') {
          i++; break // closing quote
        } else {
          val += line[i++]
        }
      }
      cells.push(val.trim())
      if (line[i] === ',') i++ // skip comma
    } else {
      // Unquoted field
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

/**
 * Split CSV text into rows, respecting quoted newlines.
 */
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

/**
 * Parse a CSV string into inventory items.
 * Uses fuzzy column name matching so exports from most booking software
 * are accepted without manual formatting.
 */
export function parseInventoryCSV(csv: string): InventoryItem[] {
  const rows = splitCSVRows(csv.trim())
  if (rows.length < 2) return []

  const rawHeaders = parseCSVRow(rows[0]).map(h => h.toLowerCase())

  // Fuzzy column mapper
  const col = (candidates: string[]): number =>
    rawHeaders.findIndex(h => candidates.some(c => h.includes(c)))

  const nameIdx      = col(['name', 'item', 'product', 'rental', 'title'])
  const descIdx      = col(['description', 'desc', 'details', 'notes', 'about'])
  const priceIdx     = col(['price', 'rate', 'cost', 'amount'])
  const categoryIdx  = col(['category', 'type', 'group', 'class'])
  const tagsIdx      = col(['tags', 'keywords', 'labels'])
  const ageMinIdx    = col(['age_min', 'minage', 'min age', 'age min', 'minimum age'])
  const ageMaxIdx    = col(['age_max', 'maxage', 'max age', 'age max', 'maximum age'])
  const capacityIdx  = col(['capacity', 'guests', 'max guests', 'guest count', 'max_guests'])
  const imageIdx     = col(['image', 'photo', 'img', 'picture', 'url'])

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
