import Link from 'next/link'
import { fetchListingsPaged, countListings } from '@/lib/db'

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

const PER_PAGE = 50

export default async function Page({
  searchParams,
}: {
  searchParams?: { page?: string }
}) {
  const currentPage = Math.max(1, Number(searchParams?.page ?? '1'))
  const offset = (currentPage - 1) * PER_PAGE

  // čteme přímo z DB (rychlejší a bez klientských knihoven)
  const [items, total] = await Promise.all([
    fetchListingsPaged({ limit: PER_PAGE, offset }),
    countListings(),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Hlídač realit – výpis</h1>
            <p className="text-gray-600">Zobrazuji {items.length} záznamů (stránka {currentPage} z {totalPages}).</p>
          </div>
          <Link
            href="/api/apify/scrape-all"
            prefetch={false}
            className="px-4 py-2 rounded-xl bg-black text-white hover:opacity-90"
          >
            Načíst nové (uložit do DB)
          </Link>
        </header>

        {/* PAGINACE NAHOŘE */}
        <Pagination currentPage={currentPage} totalPages={totalPages} />

        {/* GRID KARET */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((l: Listing) => (
            <a
              key={l.id}
              href={l.url}
              target="_blank"
              rel="noreferrer"
              className="group bg-white rounded-2xl border shadow-sm hover:shadow-md transition overflow-hidden flex flex-col"
            >
              {l.image_url ? (
                <img
                  src={l.image_url}
                  alt={l.title}
                  className="w-full h-48 object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-48 bg-gray-100" />
              )}
              <div className="p-4 flex-1 flex flex-col gap-2">
                <div className="text-xs uppercase tracking-wide text-gray-500">
                  <span className="inline-block px-2 py-0.5 rounded-full bg-gray-100">
                    {LABEL[l.source] || l.source}
                  </span>
                </div>
                <div className="font-semibold leading-snug line-clamp-2">{l.title || 'Bez názvu'}</div>
                <div className="text-sm text-gray-700">{[l.price, l.location].filter(Boolean).join(' · ')}</div>
                <div className="mt-auto text-xs text-gray-500">
                  První záznam: {new Date(l.first_seen).toLocaleString()}
                </div>
              </div>
            </a>
          ))}
        </div>

        {items.length === 0 && (
          <div className="text-gray-600">Zatím žádné záznamy. Zkus kliknout na „Načíst nové (uložit do DB)“.</div>
        )}

        {/* PAGINACE DOLE */}
        <Pagination currentPage={currentPage} totalPages={totalPages} />
      </div>
    </main>
  )
}

function Pagination({ currentPage, totalPages }: { currentPage: number; totalPages: number }) {
  const prevPage = Math.max(1, currentPage - 1)
  const nextPage = Math.min(totalPages, currentPage + 1)

  return (
    <div className="flex items-center justify-center gap-2">
      <Link
        href={`/?page=${prevPage}`}
        prefetch={false}
        className={`px-3 py-1.5 rounded border ${currentPage === 1 ? 'pointer-events-none opacity-50' : 'bg-white hover:bg-gray-50'}`}
      >
        ← Předchozí
      </Link>

      <span className="text-sm text-gray-600">
        Stránka <b>{currentPage}</b> / {totalPages}
      </span>

      <Link
        href={`/?page=${nextPage}`}
        prefetch={false}
        className={`px-3 py-1.5 rounded border ${currentPage === totalPages ? 'pointer-events-none opacity-50' : 'bg-white hover:bg-gray-50'}`}
      >
        Další →
      </Link>
    </div>
  )
}
