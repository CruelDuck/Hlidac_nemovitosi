import { NextResponse } from 'next/server'
import { runApifyActor, mapToUnified } from '@/lib/apify'

export const dynamic = 'force-dynamic'

// pevně typované mapování → z něj si odvodíme typ klíče
const ACTOR_MAP = {
  sreality: 'peTrGS4Exywwytc5V',
  bezrealitky: '50nuVLm1gX5ER9GGl',
  ulovdomov: '3dfMzh0h3PIBcuPmj',
  idnes: '0dCbYk6Qh3uqJBgOG',
} as const

type SourceKey = keyof typeof ACTOR_MAP

export async function GET(_req: Request, ctx: { params: { source: string } }) {
  const raw = ctx.params.source

  // místo Object.hasOwn použijeme bezpečnou verzi:
  const isKnown = Object.prototype.hasOwnProperty.call(ACTOR_MAP, raw)
  if (!isKnown) {
    return NextResponse.json({ ok: false, error: `Unknown source '${raw}'` }, { status: 400 })
  }

  const source = raw as SourceKey
  const actorId = ACTOR_MAP[source]

  try {
    const items = await runApifyActor(actorId, {}, { memoryMB: 512, timeoutSec: 180, limitItems: 100 })
    const listings = items
      .map(it => mapToUnified(it, source))
      .filter(x => x.url)

    return NextResponse.json({ ok: true, source, count: listings.length, listings })
  } catch (e: any) {
    return NextResponse.json({ ok: false, source, error: String(e?.message || e) }, { status: 500 })
  }
}
