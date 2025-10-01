import { NextResponse } from 'next/server'
import { fetchListings } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const source = searchParams.get('source') || undefined
  const q = searchParams.get('q') || undefined
  const limit = Number(searchParams.get('limit') || '30')

  const rows = await fetchListings({ source, q, limit })
  return NextResponse.json(Array.isArray(rows) ? rows : [])
}
