'use client'

import { useState } from 'react'
import ListingsGrid from '@/components/ListingsGrid'

type ScrapeResp = {
  ok: boolean
  scrapedTotal?: number
  insertedTotal?: number
  bySource?: Record<string, { ok: boolean; scraped?: number; inserted?: number; error?: string }>
}

export default function HomePage() {
  const [loading, setLoading] = useState(false)
  const [info, setInfo] = useState<ScrapeResp | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  async function run() {
    setLoading(true)
    setErr(null)
    setInfo(null)
    try {
      const r = await fetch('/api/apify/scrape-all', { cache: 'no-store' })
      const j: ScrapeResp = await r.json()
      setInfo(j)
      // po uložení do DB vynutíme refetch gridu
      setRefreshKey((x) => x + 1)
    } catch (e: any) {
      setErr(String(e?.message || e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Hlídač realit – všichni poskytovatelé</h1>
            <p className="text-gray-600">Kliknutím na tlačítko stáhnu nové inzeráty do databáze a níže je zobrazím.</p>
          </div>
          <button
            onClick={run}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50"
          >
            {loading ? 'Načítám…' : 'Načíst nové'}
          </button>
        </div>

        {err && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded">Chyba: {err}</div>}

        {info && (
          <div className="rounded-xl border bg-white p-4 text-sm space-y-1">
            <div>Staženo celkem: <b>{info.scrapedTotal ?? 0}</b></div>
            <div>Vloženo nových do DB: <b>{info.insertedTotal ?? 0}</b></div>
            {info.bySource && (
              <div className="text-xs text-gray-600">
                {Object.entries(info.bySource).map(([k, v]) =>
                  v.ok
                    ? <div key={k}>{k}: scraped {v.scraped ?? 0}, inserted {v.inserted ?? 0}</div>
                    : <div key={k}>{k}: chyba – {v.error}</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* GRID načítá vždy z DB, řazení podle first_seen už dělá SQL v /api/listings */}
        <ListingsGrid refreshKey={refreshKey} limit={60} />
      </div>
    </main>
  )
}
