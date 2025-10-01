import { NextResponse } from 'next/server'
import { runApifyActor, mapToUnified } from '@/lib/apify'
import { ensureSchema, upsertListingsReturnNew } from '@/lib/db'

export const dynamic = 'force-dynamic'

// map zdroj → actorId
const SOURCES: { key: 'sreality'|'bezrealitky'|'ulovdomov'|'idnes'; actor: string }[] = [
  { key: 'sreality',    actor: 'peTrGS4Exywwytc5V' },
  { key: 'bezrealitky', actor: '50nuVLm1gX5ER9GGl' },
  { key: 'ulovdomov',   actor: '3dfMzh0h3PIBcuPmj' },
  { key: 'idnes',       actor: '0dCbYk6Qh3uqJBgOG' },
]

export async function GET() {
  await ensureSchema()

  const bySource: Record<string, any> = {}
  let scrapedTotal = 0
  let insertedTotal = 0

  // sekvenčně (šetří limity)
  for (const { key, actor } of SOURCES) {
    try {
      const raw = await runApifyActor(actor, {}, { memoryMB: 512, timeoutSec: 180, limitItems: 100 })
      const list = raw.map((it) => mapToUnified(it, key)).filter(x => x.url)
      scrapedTotal += list.length

      const inserted = await upsertListingsReturnNew(list as any)
      insertedTotal += inserted.length

      bySource[key] = { ok: true, scraped: list.length, inserted: inserted.length }
      // malá pauza
      await new Promise(r => setTimeout(r, 800))
    } catch (e: any) {
      bySource[key] = { ok: false, error: String(e?.message || e) }
    }
  }

  return NextResponse.json({ ok: true, scrapedTotal, insertedTotal, bySource })
}
