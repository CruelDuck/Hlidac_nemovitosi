import { NextResponse } from 'next/server'
import { ensureSchema, upsertListings } from '@/lib/db'
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

  // Získej obě sady paralelně; když jeden fetch selže, vrať prázdné pole stejného typu
  const [sr, br]: [Listing[], Listing[]] = await Promise.all([
    fetchSrealityListings().catch(() => [] as Listing[]),
    fetchBezrealitkyListings().catch(() => [] as Listing[]),
  ])

  const all: Listing[] = [...sr, ...br]
  const inserted = await upsertListings(all as any)
  return NextResponse.json({ ok: true, scraped: all.length, inserted })
}
