import { NextResponse } from 'next/server'
import { ensureSchema, upsertListingsReturnNew, pool } from '@/lib/db'
import { fetchSrealityListings, fetchBezrealitkyListings } from '@/lib/normalize'
import type { Listing } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  const started = Date.now()

  if (process.env.SCRAPE_ENABLED === 'false') {
    return NextResponse.json({ ok: false, reason: 'SCRAPE_DISABLED' }, { status: 503 })
  }

  const jitter = Number(process.env.SCRAPE_JITTER || '0')
  if (jitter > 0) {
    await new Promise((res) => setTimeout(res, Math.floor(Math.random() * jitter * 1000)))
  }

  await ensureSchema()

  let sr: Listing[] = []
  let br: Listing[] = []
  let errSr: string | null = null
  let errBr: string | null = null

  await Promise.all([
    (async () => { try { sr = await fetchSrealityListings() } catch (e:any) { errSr = String(e?.message || e) } })(),
    (async () => { try { br = await fetchBezrealitkyListings() } catch (e:any) { errBr = String(e?.message || e) } })(),
  ])

  const scrapedBy = { sreality: sr.length, bezrealitky: br.length }
  const all: Listing[] = [...sr, ...br]

  const insertedRows = await upsertListingsReturnNew(all as any)

  const agg = await pool.query<{ source: string; count: string }>(
    `SELECT source, COUNT(*)::text AS count FROM listings GROUP BY source ORDER BY source`
  )
  const total = await pool.query<{ cnt: string }>(`SELECT COUNT(*)::text AS cnt FROM listings`)

  return NextResponse.json({
    ok: true,
    took_ms: Date.now() - started,
    scraped: all.length,
    scrapedBy,
    inserted: insertedRows.length,
    newItems: insertedRows,
    errors: { sreality: errSr, bezrealitky: errBr },
    db: { bySource: agg.rows, total: total.rows[0]?.cnt ?? '0' }
  })
}
