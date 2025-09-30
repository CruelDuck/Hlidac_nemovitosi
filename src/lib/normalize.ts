// src/lib/normalize.ts 
import type { Listing } from '@/lib/types'
import * as cheerio from 'cheerio'

function env(name: string, fallback: string) {
  return process.env[name] && process.env[name]!.length ? process.env[name]! : fallback
}

// Výchozí URL (bez řešení filtrů – ať to hned něco vrací)
const SREALITY_URL_DEFAULT = env('SREALITY_URL', 'https://www.sreality.cz/hledani/prodej/byty')
const BEZREALITKY_URL_DEFAULT = env('BEZREALITKY_URL', 'https://www.bezrealitky.cz/vypis/nabidka-prodej/byt')

// Helpery pro CSV proměnné; nevadí, když je teď nepoužijeme
export function getSrealityUrls(): string[] {
  const csv = process.env.SREALITY_URLS?.trim()
  if (csv) return csv.split(',').map(s => s.trim()).filter(Boolean)
  return [SREALITY_URL_DEFAULT]
}
export function getBezrealitkyUrls(): string[] {
  const csv = process.env.BEZREALITKY_URLS?.trim()
  if (csv) return csv.split(',').map(s => s.trim()).filter(Boolean)
  return [BEZREALITKY_URL_DEFAULT]
}

/**
 * Robustnější parser pro Sreality
 * 1) Zkusí známé “karty” (víc variant selektorů)
 * 2) Když nic, fallback: projde všechny <a href*="/detail/"> a aspoň zachytí URL
 */
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

  // --- Metoda A: “karty výsledků” přes širší sadu selektorů ---
  const cards = $('div.property, div._2h2i6, div[data-testid="result"], li[class*="result"], div[class*="result"]')
  cards.each((_, el) => {
    const root = $(el)

    // URL detailu
    let url = root.find('a[href*="/detail/"]').first().attr('href') || ''
    if (url && url.startsWith('/')) url = 'https://www.sreality.cz' + url
    if (!url || seen.has(url)) return

    // Titulek
    const title =
      root.find('h2, h3, span.name').first().text().trim() ||
      root.find('a[href*="/detail/"]').first().attr('title')?.trim() ||
      ''

    // Cena
    const price =
      root.find('span.price, div.price, span[class*="price"], div[class*="price"]').first().text().trim() || ''

    // Lokalita
    const location =
      root.find('span.locality, p.locality, span[class*="locality"], div[class*="locality"]').first().text().trim() || ''

    // Obrázek
    let img = root.find('img').first().attr('src') || root.find('img').first().attr('data-src') || null
    const image_url = img ? (img.startsWith('//') ? 'https:' + img : img) : null

    // Přidej jen smysluplné karty (aspoň URL)
    if (url) {
      out.push({ source: 'sreality', title, price, location, image_url, url })
      seen.add(url)
    }
  })

  // --- Metoda B (fallback): projdi odkazy na detail, když karty selžou ---
  if (out.length === 0) {
    $('a[href*="/detail/"]').each((_, a) => {
      let url = $(a).attr('href') || ''
      if (url && url.startsWith('/')) url = 'https://www.sreality.cz' + url
      if (!url || seen.has(url)) return

      const title = $(a).attr('title')?.trim() || $(a).text().trim() || ''
      // zkus získat obrázek z nejbližšího img (není-li, zůstane null)
      let img = $(a).find('img').attr('src') || $(a).find('img').attr('data-src') || null
      const image_url = img ? (img.startsWith('//') ? 'https:' + img : img) : null

      out.push({ source: 'sreality', title, price: '', location: '', image_url, url })
      seen.add(url)
    })
  }

  return out
}

/** Bezrealitky – menší úpravy (price/location můžou být prázdné, to doladíme později) */
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

  $('article, div.offer-item, [data-cy="estate-card"], li[class*="estate"]').each((_, el) => {
    const root = $(el)
    let url = root.find('a[href]').first().attr('href') || ''
    if (url && url.startsWith('/')) url = 'https://www.bezrealitky.cz' + url
    if (!url || seen.has(url)) return

    const title = root.find('h2, h3').first().text().trim() || root.find('a[href]').first().attr('title')?.trim() || ''
    const price = root.find('p.price, .price, span[class*="price"]').first().text().trim() || ''
    const location = root.find('p.location, .location, span[class*="locality"]').first().text().trim() || ''
    let img = root.find('img').first().attr('src') || root.find('img').first().attr('data-src') || null
    const image_url = img ? (img.startsWith('//') ? 'https:' + img : img) : null

    out.push({ source: 'bezrealitky', title, price, location, image_url, url })
    seen.add(url)
  })

  return out
}
