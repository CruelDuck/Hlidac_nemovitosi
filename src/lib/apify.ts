export type ApifyListing = Record<string, any>

function getToken() {
  const t = process.env.APIFY_TOKEN
  if (!t) throw new Error('APIFY_TOKEN missing')
  return t
}

// fallback – poslední úspěšný dataset
async function fetchLastDatasetItems(actorId: string, limit = 100) {
  const runsUrl = new URL(`https://api.apify.com/v2/acts/${actorId}/runs`)
  runsUrl.searchParams.set('token', getToken())
  runsUrl.searchParams.set('status', 'SUCCEEDED')
  runsUrl.searchParams.set('limit', '1')
  runsUrl.searchParams.set('desc', 'true')
  const runsRes = await fetch(runsUrl, { cache: 'no-store' })
  if (!runsRes.ok) return []
  const runs = await runsRes.json() as any
  const dsId = runs?.data?.items?.[0]?.defaultDatasetId
  if (!dsId) return []
  const itemsUrl = new URL(`https://api.apify.com/v2/datasets/${dsId}/items`)
  itemsUrl.searchParams.set('token', getToken())
  itemsUrl.searchParams.set('limit', String(limit))
  itemsUrl.searchParams.set('clean', '1')
  const itemsRes = await fetch(itemsUrl, { cache: 'no-store' })
  if (!itemsRes.ok) return []
  const data = await itemsRes.json().catch(() => [])
  return Array.isArray(data) ? data : []
}

export async function runApifyActor(
  actorId: string,
  input: any = {},
  opts: { memoryMB?: number; timeoutSec?: number; limitItems?: number } = {}
) {
  const { memoryMB = 512, timeoutSec = 180, limitItems = 100 } = opts
  const url = new URL(`https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items`)
  url.searchParams.set('token', getToken())
  url.searchParams.set('memory', String(memoryMB))
  url.searchParams.set('timeout', String(timeoutSec))

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ maxItems: limitItems, ...(input || {}) }),
    cache: 'no-store',
  })

  if (!res.ok) {
    if (res.status === 402) {
      const fb = await fetchLastDatasetItems(actorId, limitItems).catch(() => [])
      return Array.isArray(fb) ? fb : []
    }
    const text = await res.text().catch(() => '')
    throw new Error(`Apify ${actorId} ${res.status} ${res.statusText}: ${text.slice(0,500)}`)
  }
  const data = await res.json().catch(() => [])
  return Array.isArray(data) ? data : []
}

// ===== normalizace hodnot =====
function firstStr(...vals: any[]) {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}
function firstNum(...vals: any[]) {
  for (const v of vals) {
    if (typeof v === 'number' && !Number.isNaN(v)) return v
    if (typeof v === 'string') {
      const n = parsePriceToNumber(v)
      if (n != null) return n
    }
  }
  return null
}
function parsePriceToNumber(s: string): number | null {
  const t = s.replace(/\s/g, '').replace(/[^\d.,]/g, '')
  if (!t) return null
  // prefer celá čísla (CZK)
  const onlyDigits = t.replace(/[.,]/g, '')
  if (/^\d+$/.test(onlyDigits)) return Number(onlyDigits)
  // případný desetinný oddělovač
  const normalized = t.replace(/\./g, '').replace(',', '.')
  const val = Number(normalized)
  return Number.isFinite(val) ? val : null
}

// extrahuje "Prodej bytu" + adresu z titulu
function splitOfferAndAddress(title: string) {
  // ošetření spojení bez mezery "Prodej bytuValdštejnova"
  const fixed = title.replace(/(Prodej|Pronájem)(\s+bytu| domu| pozemku| garáže| chaty| chalupy| kanceláře| objektu| vily| 1\+| 2\+| 3\+| 4\+| 5\+)?/i, (m) => m + ' ')
  const m = fixed.match(/^((Prodej|Pronájem)[^,]*)[, ]+(.*)$/i)
  if (m) {
    return { offer: m[1].trim(), addr: m[3].trim() }
  }
  // fallback: prvních pár slov jako offer, zbytek adresa
  const parts = fixed.split(',').map(s => s.trim())
  return { offer: parts[0] || fixed, addr: parts.slice(1).join(', ') || '' }
}

/** Map z libovolné varianty actoru na náš tvar + doplnění price_num / address */
export function mapToUnified(
  item: ApifyListing,
  source: 'sreality'|'bezrealitky'|'ulovdomov'|'idnes'
) {
  const url = firstStr(item.url, item.detailUrl, item.link)

  // titulek
  const title = firstStr(item.title, item.name, item.heading)

  // cena – projdeme víc možností (číslo, text i strukturované)
  const price_text = firstStr(
    item.priceText, item.price_text, item.cena_text,
    (item.price_czk && (item.price_czk.text || item.price_czk.value_text)),
    (item.price && typeof item.price === 'string' ? item.price : null),
    String(item.cena ?? '')
  )
  const price_num = firstNum(
    item.price_num, item.priceValue, item.cena_value,
    item.price_czk && (item.price_czk.value ?? item.price_czk.v),
    (typeof item.price === 'number' ? item.price : null),
    price_text
  )

  // adresa / lokalita
  const address = firstStr(
    item.address, item.adresa, item.location, item.locality, item.mesto,
    item.city && item.street ? `${item.street}, ${item.city}` : null
  ) || splitOfferAndAddress(title).addr
  const location = address // pro kompatibilitu

  // obrázek
  const pickArr = (arr?: any[]) =>
    Array.isArray(arr) && arr.length ? (typeof arr[0] === 'string' ? arr[0] : arr[0]?.url) : null
  const image_url =
    pickArr(item.images) || pickArr(item.photos) || pickArr(item.pictures) ||
    (typeof item.image === 'string' ? item.image : null) || null

  return {
    source,
    title: title || 'Bez názvu',
    price_text: price_text || null,
    price_num: price_num,
    address: address || null,
    location: location || null,
    image_url,
    url: url || '',
  }
}
