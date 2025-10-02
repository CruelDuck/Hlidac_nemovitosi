import { NextResponse } from 'next/server'
import { ensureSchema, countListings, fetchListingsPaged } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const conn = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL
    if (!conn) {
      return NextResponse.json({ ok: false, step: 'env', error: 'Missing SUPABASE_DB_URL or DATABASE_URL' }, { status: 500 })
    }

    await ensureSchema()
    const total = await countListings()
    const sample = await fetchListingsPaged({ limit: 3, offset: 0 })

    return NextResponse.json({
      ok: true,
      env: 'ok',
      total,
      sample: sample.map(s => ({ id: s.id, title: s.title, url: s.url })),
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, step: 'runtime', error: String(e?.message || e) }, { status: 500 })
  }
}