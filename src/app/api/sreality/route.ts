import { NextResponse } from 'next/server'
import { runApifyActor } from '@/lib/apify'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const items = await runApifyActor('peTrGS4Exywwytc5V', {
      // zde můžeš poslat filtry, viz Apify console -> Input schema
    })
    return NextResponse.json({ ok: true, count: items.length, listings: items })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 })
  }
}
