import { NextResponse } from 'next/server'
import { runApifyActor, mapToUnified } from '@/lib/apify'

export const dynamic = 'force-dynamic'

const SOURCES: { key: 'sreality' | 'bezrealitky' | 'ulovdomov' | 'idnes'; actor: string }[] = [
  { key: 'sreality',    actor: 'peTrGS4Exywwytc5V' },
  { key: 'bezrealitky', actor: '50nuVLm1gX5ER9GGl' },
  { key: 'ulovdomov',   actor: '3dfMzh0h3PIBcuPmj' },
  { key: 'idnes',       actor: '0dCbYk6Qh3uqJBgOG' },
]

export async function GET() {
  const results = await Promise.allSettled(
    SOURCES.map(async ({ key, actor }) => {
      const items = await runApifyActor(actor, {})
      const listings = items.map((it) => mapToUnified(it, key)).filter((x) => x.url)
      return { key, ok: true as const, count: listings.length, listings }
    })
  )

  const bySource: Record<string, any> = {}
  let total = 0

  for (const r of results) {
    if (r.status === 'fulfilled') {
      bySource[r.value.key] = {
        ok: true,
        count: r.value.count,
        listings: r.value.listings,
      }
      total += r.value.count
    } else {
      // na případný error
      const i = results.indexOf(r)
      const key = SOURCES[i]?.key || `src${i}`
      bySource[key] = { ok: false, error: String(r.reason || 'unknown error'), listings: [] }
    }
  }

  return NextResponse.json({ ok: true, total, bySource })
}
