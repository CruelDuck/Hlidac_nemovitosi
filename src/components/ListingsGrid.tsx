'use client'

import { useEffect, useState } from 'react'

type Listing = {
  id: number
  source: 'sreality' | 'bezrealitky' | 'ulovdomov' | 'idnes'
  title: string
  price: string
  location: string
  image_url: string | null
  url: string
  first_seen: string
}

const LABEL: Record<Listing['source'], string> = {
  sreality: 'Sreality',
  bezrealitky: 'Bezrealitky',
  ulovdomov: 'UlovDomov',
  idnes: 'iDNES',
}

export default function ListingsGrid({ refreshKey, limit = 60 }: { refreshKey: number; limit?: number }) {
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<Listing[]>([])
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`/api/listings?limit=${limit}`, { cache: 'no-store' })
      const j = await r.json()
      setRows(Array.isArray(j) ? j : [])
    } catch (e: any) {
      setError(String(e?.message || e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [refreshKey, limit])

  return (
    <div className="space-y-3">
      {error && <div className="p-2 rounded border bg-red-50 text-red-700">Chyba: {error}</div>}
      {loading && <div className="text-gray-600">Načítám…</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rows.map((l) => (
          <a
            key={l.id}
            href={l.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border p-3 hover:shadow transition bg-white"
          >
            {l.image_url ? (
              <img src={l.image_url} alt={l.title} className="w-full h-48 object-cover rounded-lg" loading="lazy" />
            ) : (
              <div className="w-full h-48 bg-gray-100 rounded-lg" />
            )}
            <div className="mt-3 space-y-1">
              <div className="text-xs text-gray-500 uppercase">{LABEL[l.source]}</div>
              <div className="font-semibold">{l.title || 'Bez názvu'}</div>
              <div className="text-sm text-gray-700">{[l.price, l.location].filter(Boolean).join(' · ')}</div>
              <div className="text-xs text-gray-500">První záznam: {new Date(l.first_seen).toLocaleString()}</div>
            </div>
          </a>
        ))}
      </div>

      {!loading && rows.length === 0 && <div className="text-gray-600">Zatím nic v databázi.</div>}
    </div>
  )
}
