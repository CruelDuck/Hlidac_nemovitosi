'use client'

import { useEffect, useState } from 'react'

type Listing = {
  id?: number
  source: 'sreality' | 'bezrealitky'
  title: string
  price: string
  location: string
  image_url: string | null
  url: string
  first_seen?: string
}

type ScrapeResult = {
  ok: boolean
  scraped?: number
  scrapedBy?: { sreality: number; bezrealitky: number }
  inserted?: number
  newItems?: Listing[]
  db?: { bySource: { source: string; count: string }[]; total: string }
  errors?: { sreality: string | null; bezrealitky: string | null }
  took_ms?: number
  reason?: string
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`GET ${url} failed: ${res.status} ${res.statusText} — ${text.slice(0, 300)}`)
  }
  return res.json()
}

export default function ManualScraper() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ScrapeResult | null>(null)
  const [listings, setListings] = useState<Listing[]>([])
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  async function loadListings() {
    try {
      const data = await fetchJson<Listing[]>('/api/listings?limit=30')
      // ochrana: některé API mohou vrátit objekt místo pole, ošetříme
      setListings(Array.isArray(data) ? data : [])
      setLastUpdated(new Date().toISOString())
    } catch (e: any) {
      setError(String(e?.message || e))
      // eslint-disable-next-line no-console
      console.error('loadListings error', e)
      setListings([])
    }
  }

  useEffect(() => {
    loadListings()
  }, [])

  async function handleScrape() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchJson<ScrapeResult>('/api/scrape')
      setResult(data)
      await loadListings()
    } catch (e: any) {
      setError(String(e?.message || e))
      // eslint-disable-next-line no-console
      console.error('handleScrape error', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={handleScrape}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50"
        >
          {loading ? 'Aktualizuji…' : 'Aktualizovat teď'}
        </button>
        <span className="text-sm text-gray-500">
          {lastUpdated ? `Naposledy načteno: ${new Date(lastUpdated).toLocaleString()}` : 'Načítám…'}
        </span>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
          Chyba: {error}
        </div>
      )}

      {result && (
        <div className="rounded-xl border p-4 bg-white space-y-2">
          <div className="font-semibold">Výsledek aktualizace</div>
          <div className="text-sm text-gray-700">
            Staženo celkem: <b>{result.scraped ?? 0}</b>{' '}
            {result.scrapedBy && (
              <>
                (Sreality: <b>{result.scrapedBy.sreality}</b>, Bezrealitky: <b>{result.scrapedBy.bezrealitky}</b>)
              </>
            )}
            , vloženo nových: <b>{result.inserted ?? 0}</b>
            {typeof result.took_ms === 'number' && <> · {result.took_ms} ms</>}
          </div>
          {result.reason && <div className="text-xs text-gray-500">Pozn.: {result.reason}</div>}
          {result.errors && (result.errors.sreality || result.errors.bezrealitky) && (
            <div className="text-xs text-gray-500">
              {result.errors.sreality && <>Sreality: {result.errors.sreality} · </>}
              {result.errors.bezrealitky && <>Bezrealitky: {result.errors.bezrealitky}</>}
            </div>
          )}
          {result.newItems && Array.isArray(result.newItems) && result.newItems.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer">Zobrazit nové položky ({result.newItems.length})</summary>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                {result.newItems.map((x, i) => (
                  <li key={`${x.url}-${i}`}>
                    <a href={x.url} target="_blank" rel="noreferrer" className="underline">
                      {x.title || x.url}
                    </a>{' '}
                    <span className="text-gray-500">
                      [{x.source}] {x.price} {x.location && `· ${x.location}`}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
          {result?.db && (
            <div className="text-xs text-gray-500">
              V DB celkem: <b>{result.db.total}</b>{' '}
              {result.db.bySource?.length > 0 && <>· {result.db.bySource.map((r) => `${r.source}: ${r.count}`).join(' · ')}</>}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(listings || []).map((l, idx) => {
          const img = l?.image_url || ''
          return (
            <a
              key={`${l?.url || 'no-url'}-${idx}`}
              href={l?.url || '#'}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border p-3 hover:shadow transition bg-white"
            >
              {img ? (
                <img
                  src={img}
                  alt={l?.title || 'Inzerát'}
                  className="w-full h-40 object-cover rounded-lg"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-40 bg-gray-100 rounded-lg" />
              )}
              <div className="mt-3 space-y-1">
                <div className="text-sm text-gray-500 uppercase">{l?.source}</div>
                <div className="font-semibold">{l?.title || 'Bez názvu'}</div>
                <div className="text-sm">{[l?.price, l?.location].filter(Boolean).join(' · ')}</div>
                {l?.first_seen && (
                  <div className="text-xs text-gray-500">
                    První záznam: {new Date(l.first_seen).toLocaleString()}
                  </div>
                )}
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}
