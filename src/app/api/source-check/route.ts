// src/app/api/source-check/route.ts
import { NextResponse } from 'next/server'
import { fetchSrealityListings, fetchBezrealitkyListings } from '@/lib/normalize'
import type { Listing } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  const results = await Promise.allSettled([
    fetchSrealityListings(),
    fetchBezrealitkyListings(),
  ])

  const sreality = results[0].status === 'fulfilled'
    ? { ok: true, count: (results[0] as PromiseFulfilledResult<Listing[]>).value.length, sample: (results[0] as PromiseFulfilledResult<Listing[]>).value.slice(0,3) }
    : { ok: false, error: String((results[0] as PromiseRejectedResult).reason) }

  const bezrealitky = results[1].status === 'fulfilled'
    ? { ok: true, count: (results[1] as PromiseFulfilledResult<Listing[]>).value.length, sample: (results[1] as PromiseFulfilledResult<Listing[]>).value.slice(0,3) }
    : { ok: false, error: String((results[1] as PromiseRejectedResult).reason) }

  return NextResponse.json({ ok: true, sreality, bezrealitky })
}
