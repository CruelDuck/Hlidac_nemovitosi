import { NextResponse } from 'next/server'
import { ensureSchema, upsertListingsReturnNew, pool } from '@/lib/db'
import { fetchSrealityListings, fetchBezrealitkyListings } from '@/lib/normalize'
import type { Listing } from '@/lib/types'

export const dynamic = 'force-dynamic'

// přidej stránkování jen pokud nastavíš SCRAPE_PAGES>1
function withPage(url: string, page: number): string {
  const u = new URL(url)
  if (u.hostname.includes('sreality.cz')) u.searchParams.set('strana', String(page))
  else u.searchParams.set('page', String(page))
  return u.toString()
}

export async function GET() {
  if (process.env.SCRAPE_ENABLED === 'false') {
    return NextResponse.json({ ok: false, reason: 'SCRAPE_DISABLED' }, { status: 503 })
  }

  const jitter = Number(process.env.SCRAPE_JITTER || '0')
  if (jitter > 0) {
    await new Promise((res) => setTimeout(res, Math.floor(Math.random() * jitter * 1000)))
  }

  await ensureSchema()

  // pages default 1 (žádná změna), navýšíš až chceš víc výsledků
  const pages = Math.max(1, Number(process.env.SCRAPE_PAGES || '1'))

  const srTasks: Promise<Listing[]>[] = []
  const brTasks: Promise<Listing[]>[] = []

  for (let p = 1; p <= pages; p++) {
    srTasks.push(fetchSrealityListings(p === 1 ? undefined : withPage(undefined!, p)).catch(() => []))
    brTasks.push(fetchBezrealitkyListings(p === 1 ? undefined : withPage(undefined!, p)).catch(() => []))
  }

  // první stránka bez withPage, ostatní přes withPage – když bys chtěl přesné URL, přidáme env SREALITY_URL(S)
  const [srFirst, brFirst] = await Promise.all([
    fetchSrealityListings().catch(() => [] as Listing[]),
    fetchBezrealitkyListings().catch(() => [] as Listing[]),
  ])
  const srRest = (await Promise.all(srTasks.slice(1))).flat()
  const brRest = (await Promise.all(brTasks.slice(1))).flat()

  const sr = [...srFirst, ...srRest]
  const br = [...brFirst, ...brRest]

  const scrapedBy = { sreality: sr.length, bezrealitky: br.length }
  const all = [...sr, ...br]

  const insertedRows = await upsertListingsReturnNew(all as any)

  const agg = await pool.query<{ source: string; count: string }>(
    `SELECT source, COUNT(*)::text AS count FROM listings GROUP BY source ORDER BY source`
  )
  const total = await pool.query<{ cnt: string }>(`SELECT COUNT(*)::text AS cnt FROM listings`)

  return NextResponse.json({
    ok: true,
    scraped: all.length,
    scrapedBy,
    inserted: insertedRows.length,
    newItems: insertedRows,
    db: { bySource: agg.rows, total: total.rows[0]?.cnt ?? '0' }
  })
}
