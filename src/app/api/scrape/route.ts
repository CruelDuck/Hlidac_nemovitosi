import { NextResponse } from 'next/server'
import { ensureSchema, upsertListingsReturnNew, pool } from '@/lib/db'
import { fetchSrealityListings, fetchBezrealitkyListings } from '@/lib/normalize'
import type { Listing } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (process.env.SCRAPE_ENABLED === 'false') {
    return NextResponse.json({ ok: false, reason: 'SCRAPE_DISABLED' }, { status: 503 })
  }

  const jitter = Number(process.env.SCRAPE_JITTER || '0')
  if (jitter > 0) {
    await new Promise((res) => setTimeout(res, Math.floor(Math.random() * jitter * 1000)))
  }

  await ensureSchema()

  const [sr, br]: [Listing[], Listing[]] = await Promise.all([
    fetchSrealityListings().catch(() => [] as Listing[]),
    fetchBezrealitkyListings().catch(() => [] as Listing[]),
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
    scraped: all.length,
    scrapedBy,
    inserted: insertedRows.length,
    newItems: insertedRows,     // ← TADY máš jen nové výskyty
    db: { bySource: agg.rows, total: total.rows[0]?.cnt ?? '0' }
  })
}
