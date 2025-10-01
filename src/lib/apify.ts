// src/lib/apify.ts

export type ApifyListing = {
  title?: string
  name?: string
  heading?: string
  url?: string
  detailUrl?: string
  link?: string
  price?: string | number
  priceText?: string
  cena?: string | number
  location?: string
  locality?: string
  mesto?: string
  images?: Array<{ url?: string } | string>
  photos?: Array<{ url?: string } | string>
  pictures?: Array<{ url?: string } | string>
  image?: string
}

function getToken() {
  const t = process.env.APIFY_TOKEN
  if (!t) throw new Error('APIFY_TOKEN missing')
  return t
}

async function fetchLastDatasetItems(actorId: string, limit = 100) {
  // poslední úspěšný run
  const runsUrl = new URL(`https://api.apify.com/v2/acts/${actorId}/runs`)
  runsUrl.searchParams.set('token', getToken())
  runsUrl.searchParams.set('status', 'SUCCEEDED')
  runsUrl.searchParams.set('limit', '1')
  runsUrl.searchParams.set('desc', 'true')

  const runsRes = await fetch(runsUrl, { cache: 'no-store' })
  if (!runsRes.ok) return []
  const runsJson = await runsRes.json() as any
  const datasetId = runsJson?.data?.items?.[0]?.defaultDatasetId
  if (!datasetId) return []

  // dataset items
  const itemsUrl = new URL(`https://api.apify.com/v2/datasets/${datasetId}/items`)
  itemsUrl.searchParams.set('token', getToken())
  itemsUrl.searchParams.set('limit', String(limit))
  itemsUrl.searchParams.set('clean', '1')

  const itemsRes = await fetch(itemsUrl, { cache: 'no-store' })
  if (!itemsRes.ok) return []
  const data = await itemsRes.json().catch(() => [])
  return Array.isArray(data) ? (data as ApifyListing[]) : []
}

/** Spusť actor (menší paměť); 402 → fallback na poslední dataset. */
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
    throw new Error(`Apify ${actorId} ${res.status} ${res.statusText}: ${text.slice(0, 500)}`)
  }

  const data = await res.json().catch(() => [])
  return Array.isArray(data) ? (data as ApifyListing[]) : []
}

/** Map položku z Apify do našeho DB tvaru. */
export function mapToUnified(
  item: ApifyListing,
  source: 'sreality' | 'bezrealitky' | 'ulovdomov' | 'idnes'
) {
  const url = (item.url || item.detailUrl || item.link || '')?.toString().trim()
  const title = (item.title || item.name || item.heading || '')?.toString().trim()
  const priceRaw = (item.priceText ?? item.price ?? item.cena ?? '') as any
  const price = typeof priceRaw === 'number' ? String(priceRaw) : (priceRaw || '').toString().trim()
  const location = (item.location || item.locality || item.mesto || '')?.toString().trim()

  const pick = (arr?: any[]) =>
    Array.isArray(arr) && arr.length ? (typeof arr[0] === 'string' ? arr[0] : arr[0]?.url) : null
  const image =
    pick(item.images) || pick(item.photos) || pick(item.pictures) ||
    (typeof item.image === 'string' ? item.image : null)

  return {
    source,
    title,
    price,
    location,
    image_url: image || null,
    url: url || '',
  }
}
