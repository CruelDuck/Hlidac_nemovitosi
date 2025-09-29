import { NextResponse } from 'next/server'
import { ensureSchema, upsertListings } from '@/lib/db'
import { fetchSrealityListings, fetchBezrealitkyListings } from '@/lib/normalize'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (process.env.SCRAPE_ENABLED === 'false') {
    return NextResponse.json({ ok: false, reason: 'SCRAPE_DISABLED' }, { status: 503 })
  }

  const jitter = Number(process.env.SCRAPE_JITTER || '0')
  if (jitter > 0) {
    await new Promise(res => setTimeout(res, Math.floor(Math.random() * jitter * 1000)))
  }

  await ensureSchema()

  let sr = [], br = []
  try {
    ;[sr, br] = await Promise.allSettled([
      fetchSrealityListings(),
      fetchBezrealitkyListings()
    ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : []))
  } catch (e) {}

  const all = [...sr, ...br]
  const inserted = await upsertListings(all as any)
  return NextResponse.json({ ok: true, scraped: all.length, inserted })
}
