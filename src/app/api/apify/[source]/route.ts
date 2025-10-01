import { NextResponse } from 'next/server'
import { runApifyActor, mapToUnified } from '@/lib/apify'

export const dynamic = 'force-dynamic'

// Mapování "source" -> actorId (podle toho, co jsi poslal)
const ACTOR_MAP: Record<string, string> = {
  sreality: 'peTrGS4Exywwytc5V',     // sdano-sreality
  bezrealitky: '50nuVLm1gX5ER9GGl',  // sdano-bezrealitky
  ulovdomov: '3dfMzh0h3PIBcuPmj',    // sdano-ulovdomov
  idnes: '0dCbYk6Qh3uqJBgOG',        // sdano-idnesreality
}

export async function GET(_req: Request, ctx: { params: { source: string } }) {
  const source = ctx.params.source
  const actorId = ACTOR_MAP[source]
  if (!actorId) {
    return NextResponse.json({ ok: false, error: `Unknown source '${source}'` }, { status: 400 })
  }

  try {
    // sem můžeš doplnit input filtrování; pro teď posíláme prázdný objekt
    const items = await runApifyActor(actorId, {})
    const listings = items
      .map((it) => mapToUnified(it, source))
      .filter((x) => x.url)

    return NextResponse.json({ ok: true, source, count: listings.length, listings })
  } catch (e: any) {
    return NextResponse.json({ ok: false, source, error: String(e?.message || e) }, { status: 500 })
  }
}
