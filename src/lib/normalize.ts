import type { Listing } from '@/lib/types'
import * as cheerio from 'cheerio'

function env(name: string, fallback: string) {
  return process.env[name] && process.env[name]!.length ? process.env[name]! : fallback
}

const SREALITY_URL = env('SREALITY_URL', 'https://www.sreality.cz/hledani/prodej/byty')
const BEZREALITKY_URL = env('BEZREALITKY_URL', 'https://www.bezrealitky.cz/vypis/nabidka-prodej/byt')

export async function fetchSrealityListings(listUrl = SREALITY_URL) : Promise<Listing[]> {
  const res = await fetch(listUrl, { headers: { 'user-agent': 'Mozilla/5.0' }, cache: 'no-store' })
  const html = await res.text()
  const $ = cheerio.load(html)
  const out: Listing[] = []
  $('div.property, div._2h2i6, div[data-testid="result"]').each((_, el) => {
    const root = $(el)
    const a = root.find('a[href*="/detail/"]').first()
    let url = a.attr('href') || ''
    if (url && url.startsWith('/')) url = 'https://www.sreality.cz' + url
    const title = root.find('span.name, h2').first().text().trim()
    const price = root.find('span.price, div.price, span.normal').first().text().trim()
    const location = root.find('span.locality, p.locality, span._2YLL8').first().text().trim()
    const img = root.find('img').first().attr('src') || null
    const image_url = img && img.startsWith('//') ? 'https:' + img : img
    if (url) out.push({ source: 'sreality', title, price, location, image_url, url })
  })
  return out
}

export async function fetchBezrealitkyListings(listUrl = BEZREALITKY_URL) : Promise<Listing[]> {
  const res = await fetch(listUrl, { headers: { 'user-agent': 'Mozilla/5.0' }, cache: 'no-store' })
  const html = await res.text()
  const $ = cheerio.load(html)
  const out: Listing[] = []
  $('article, div.offer-item, [data-cy="estate-card"]').each((_, el) => {
    const root = $(el)
    const a = root.find('a[href]').first()
    let url = a.attr('href') || ''
    if (url && url.startsWith('/')) url = 'https://www.bezrealitky.cz' + url
    const title = root.find('h2, h3').first().text().trim()
    const price = root.find('p.price, .price').first().text().trim()
    const location = root.find('p.location, .location').first().text().trim()
    const img = root.find('img').first().attr('src') || null
    const image_url = img && img.startsWith('//') ? 'https:' + img : img
    if (url) out.push({ source: 'bezrealitky', title, price, location, image_url, url })
  })
  return out
}
