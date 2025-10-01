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

export async function runApifyActor(actorId: string, input: any = {}) {
  const token = process.env.APIFY_TOKEN
  if (!token) throw new Error('APIFY_TOKEN missing')

  const url = new URL(`https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items`)
  url.searchParams.set('token', token)

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input || {}),
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Apify ${actorId} ${res.status} ${res.statusText}: ${text.slice(0, 500)}`)
  }
  const data = await res.json().catch(() => [])
  return Array.isArray(data) ? (data as ApifyListing[]) : []
}

export function mapToUnified(item: ApifyListing, source: string) {
  const url =
    (item.url || item.detailUrl || item.link || '')?.toString().trim()
  const title =
    (item.title || item.name || item.heading || '')?.toString().trim()
  const priceRaw = (item.priceText || item.price || item.cena || '') as any
  const price =
    typeof priceRaw === 'number' ? String(priceRaw) : (priceRaw || '').toString().trim()
  const location =
    (item.location || item.locality || item.mesto || '')?.toString().trim()

  let img: string | null = null
  const pick = (arr?: any[]) =>
    Array.isArray(arr) && arr.length
      ? (typeof arr[0] === 'string' ? arr[0] : arr[0]?.url)
      : null
  img = pick(item.images) || pick(item.photos) || pick(item.pictures) || (typeof item.image === 'string' ? item.image : null)

  return {
    source: source as 'sreality' | 'bezrealitky' | 'ulovdomov' | 'idnes',
    title,
    price,
    location,
    image_url: img || null,
    url: url || '',
  }
}
