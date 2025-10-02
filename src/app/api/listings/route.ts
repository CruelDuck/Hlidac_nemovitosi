import { NextResponse } from 'next/server'
import { fetchListingsPaged, countListings } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get('limit') || '200')
  const offset = Number(searchParams.get('offset') || '0')

  const [items, total] = await Promise.all([
    fetchListingsPaged({ limit, offset }),
    countListings(),
  ])

  return NextResponse.json({ listings: items, total })
}
