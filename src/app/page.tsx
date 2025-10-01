'use client'

import { useState } from 'react'

type Listing = {
  source: 'sreality' | 'bezrealitky' | 'ulovdomov' | 'idnes'
  title: string
  price: string
  location: string
  image_url: string | null
  url: string
}

type AllResp = {
  ok: boolean
  total: number
  bySource: Record<
    string,
    { ok: boolean; count?: number; error?: string; listings: Listing[] }
  >
}

const SOURCE_LABEL: Record<Listing['source'], string> = {
  sreality: 'Sreality',
  bezrealitky: 'Bezrealitky',
  ulovdomov: 'UlovDomov',
  idnes: 'iDNES Reality',
}

export default function HomePage() {
  const [loading, setLoading] = useState(false)
  const [resp, setResp] = useState<AllResp | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function loadAll() {
    setLoading(true)
    setErr(null)
    try {
      const r = await fetch('/api/apify/scrape-all', { cache: 'no-store' })
      const j: AllResp = await r.json()
      if (!j.ok) throw new Error('API returned ok=false')
      setResp(j)
    } catch (e: any) {
      setErr(String(e?.message || e))
    } finally {
      setLoading(false)
    }
  }

  const groups = resp?.bySource || {}

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Hlídač realit – všechny zdroje (Apify)</h1>
            <p className="text-gray-600">Klikni na tlačítko pro načtení všech zdrojů najednou.</p>
          </div>
          <button
            onClick={loadAll}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50"
          >
            {loading ? 'Načítám…' : 'Načíst vše'}
          </button>
        </div>

        {err && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded">
            Chyba: {err}
          </div>
        )}

        {resp && (
          <div className="rounded-xl border bg-white p-4">
            Celkem nalezeno: <b>{resp.total}</b>
          </div>
        )}

        {/* Skupiny po zdrojích */}
        <div className="space-y-8">
          {(['sreality','bezrealitky','ulovdomov','idnes'] as Listing['source'][]).map((key) => {
            const grp = groups[key]
            const listings: Listing[] = grp?.listings || []
            return (
              <section key={key}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-semibold">{SOURCE_LABEL[key]}</h2>
                  <div className="text-sm text-gray-600">
                    {grp
                      ? (grp.ok ? <>Položek: <b>{grp.count ?? listings.length}</b></> : <>Chyba: {grp.error}</>)
                      : '–'}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {listings.map((l, i) => (
                    <a
                      key={`${l.url}-${i}`}
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border p-3 bg-white hover:shadow transition flex flex-col"
                    >
                      {l.image_url ? (
                        <img src={l.image_url} alt={l.title} className="w-full h-48 object-cover rounded-lg" />
                      ) : (
                        <div className="w-full h-48 bg-gray-100 rounded-lg" />
                      )}
                      <div className="mt-3 space-y-1">
                        <div className="text-xs text-gray-500 uppercase">{SOURCE_LABEL[l.source]}</div>
                        <div className="font-semibold">{l.title || 'Bez názvu'}</div>
                        <div className="text-sm text-gray-600">
                          {[l.price, l.location].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
                {listings.length === 0 && grp?.ok && (
                  <div className="text-gray-600">Žádné položky (nebo actor nic nevrátil).</div>
                )}
              </section>
            )
          })}
        </div>
      </div>
    </main>
  )
}
