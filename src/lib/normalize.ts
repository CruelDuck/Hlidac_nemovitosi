import type { Listing } from '@/lib/types'
import * as cheerio from 'cheerio'

function env(name: string, fallback: string) {
  return process.env[name] && process.env[name]!.length ? process.env[name]! : fallback
}

const SREALITY_URL_DEFAULT = env('SREALITY_URL', 'https://www.sreality.cz/hledani/prodej/byty')
const BEZREALITKY_URL_DEFAULT = env('BEZREALITKY_URL', 'https://www.bezrealitky.cz/vypis/nabidka-prodej/byt')

// 🔧 helpery
function cleanText(s: string | undefined | null): string {
  if (!s) return ''
  // odebereme nadbytečné whitespace, případné “vložené” CSS/JS odřízneme na první reálný text
  const t = s.replace(/\s+/g, ' ').trim()
  // když je v textu dlouhý blok se složenými závorkami (CSS), zkusíme vzít poslední “větu” za ním
  const parts = t.split('}').pop() || t
  return parts.trim()
}

function absolutize(url: string | null, host: string): string | null {
  if (!url) return null
  if (url.startsWith('//')) return 'https:' + url
  if (url.startsWith('/')) return host + url
  return url
}

// Bezrealitky používají Next.js image proxy `/_next/image?url=...` → vytáhneme původní URL
function normalizeImageUrl(u: string | null, host: string): string | null {
  if (!u) return null
  if (u.startsWith('/_next/image')) {
    try {
      const parsed = new URL(u, host)
      const inner = parsed.searchParams.get('url')
      return inner ? decodeURIComponent(inner) : host + u
    } catch {
      return host + u
    }
  }
  return absolutize(u, host)
}

// ————————— SREALITY —————————
export async function fetchSrealityListings(listUrl: string = SREALITY_URL_DEFAULT): Promise<Listing[]> {
  const res = await fetch(listUrl, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'accept-language': 'cs-CZ,cs;q=0.9,en;q=0.8',
      'accept': 'text/html,application/xhtml+xml'
    },
    cache: 'no-store'
  })
  const html = await res.text()
  const $ = cheerio.load(html)
  const out: Listing[] = []
  const seen = new Set<string>()
  const HOST = 'https://www.sreality.cz'

  // Primární “karty” – zkusíme data-testid, pak fallbacky
  $('div[data-testid="result"], li[class*="result"], div.property, div._2h2i6').each((_, el) => {
    const root = $(el)

    let url = root.find('[data-testid="result-link"], a[href*="/detail/"]').first().attr('href') || ''
    url = absolutize(url, HOST) || ''
    if (!url || seen.has(url)) return

    const title =
      cleanText(root.find('[data-testid="result-title"] a, [data-testid="result-title"], h2 a, h2, h3, span.name').first().text()) ||
      cleanText(root.find('a[href*="/detail/"]').first().attr('title'))

    const price = cleanText(
      root.find('[data-testid="result-price"], span.price, div.price, span[class*="price"], div[class*="price"]').first().text()
    )

    const location = cleanText(
      root.find('[data-testid="result-locality"], span.locality, p.locality, span[class*="locality"], div[class*="locality"]').first().text()
    )

    const imgRaw = root.find('img').first().attr('src') || root.find('img').first().attr('data-src') || null
    const image_url = absolutize(imgRaw, HOST)

    out.push({ source: 'sreality', title, price, location, image_url, url })
    seen.add(url)
  })

  // Fallback: když nic, projdeme prostě odkazy na detail
  if (out.length === 0) {
    $('a[href*="/detail/"]').each((_, a) => {
      let url = $(a).attr('href') || ''
      url = absolutize(url, HOST) || ''
      if (!url || seen.has(url)) return

      const title = cleanText($(a).attr('title') || $(a).text())
      out.push({ source: 'sreality', title, price: '', location: '', image_url: null, url })
      seen.add(url)
    })
  }

  return out
}

// ————————— BEZREALITKY —————————
export async function fetchBezrealitkyListings(listUrl: string = BEZREALITKY_URL_DEFAULT): Promise<Listing[]> {
  const res = await fetch(listUrl, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'accept-language': 'cs-CZ,cs;q=0.9,en;q=0.8',
      'accept': 'text/html,application/xhtml+xml'
    },
    cache: 'no-store'
  })
  const html = await res.text()
  const $ = cheerio.load(html)
  const out: Listing[] = []
  const seen = new Set<string>()
  const HOST = 'https://www.bezrealitky.cz'

  $('article, div.offer-item, [data-cy="estate-card"], li[class*="estate"]').each((_, el) => {
    const root = $(el)

    let url = root.find('a[href]').first().attr('href') || ''
    url = absolutize(url, HOST) || ''
    if (!url || seen.has(url)) return

    const title = cleanText(
      root.find('h2, h3').first().text() || root.find('a[href]').first().attr('title') || ''
    )

    const price = cleanText(root.find('p.price, .price, span[class*="price"]').first().text())
    const location = cleanText(root.find('p.location, .location, span[class*="locality"]').first().text())

    const imgRaw = root.find('img').first().attr('src') || root.find('img').first().attr('data-src') || null
    const image_url = normalizeImageUrl(imgRaw, HOST)

    out.push({ source: 'bezrealitky', title, price, location, image_url, url })
    seen.add(url)
  })

  return out
}
