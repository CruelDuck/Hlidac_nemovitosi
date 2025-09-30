// src/app/api/source-check/route.ts
// src/app/api/source-check/route.ts
import { NextResponse } from 'next/server'
import {
  getSrealityUrls,
  getBezrealitkyUrls,
  fetchSrealityListings,
  fetchBezrealitkyListings,
} from '@/lib/normalize'
import type { Listing } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  const srUrls = getSrealityUrls()
  const brUrls = getBezrealitkyUrls()

  const srTasks = srUrls.map(async (url) => {
    try {
      const items: Listing[] = await fetchSrealityListings(url)
      return { url, ok: true, count: items.length, sample: items.slice(0, 3) }
    } catch (e: any) {
      return { url, ok: false, error: String(e?.message || e) }
    }
  })

  const brTasks = brUrls.map(async (url) => {
    try {
      const items: Listing[] = await fetchBezrealitkyListings(url)
      return { url, ok: true, count: items.length, sample: items.slice(0, 3) }
    } catch (e: any) {
      return { url, ok: false, error: String(e?.message || e) }
    }
  })

  const [sreality, bezrealitky] = await Promise.all([
    Promise.all(srTasks),
    Promise.all(brTasks),
  ])

  return NextResponse.json({
    ok: true,
    sreality,
    bezrealitky,
  })
}
