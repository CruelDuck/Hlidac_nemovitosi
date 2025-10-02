import { NextResponse } from 'next/server'
import { fetchListings, fetchListingsPaged, countListings } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const limit = Number(searchParams.get('limit') || '200')
  const offset = Number(searchParams.get('offset') || '0')
  const source = searchParams.get('source') || undefined
  const q = searchParams.get('q') || undefined

  // když se nepoužije žádný filtr, dovolíme i stránkování
  if (!source && !q) {
    const [items, total] = await Promise.all([
      fetchListingsPaged({ limit, offset }),
      countListings(),
    ])
    return NextResponse.json({ listings: items, total })
  }

  // fallback pro filtrování (bez offsetu)
  const items = await fetchListings({ source, q, limit })
  return NextResponse.json({ listings: items, total: items.length })
}
