import Link from 'next/link'
import { fetchListingsPaged, countListings } from '@/lib/db'

type Listing = {
  id: number
  source: 'sreality' | 'bezrealitky' | 'ulovdomov' | 'idnes'
  title: string
  price_text: string | null
  price_num: number | null
  address: string | null
  location: string | null
  image_url: string | null
  url: string
  first_seen: string
}

const PER_PAGE = 50

function extractOffer(title: string) {
  const m = title.match(/^(Prodej|Pronájem)\s+[^\d,]+/i)
  return m ? m[0] : (title.split(',')[0] || title)
}

export default async function Page({ searchParams }: { searchParams?: { page?: string } }) {
  const currentPage = Math.max(1, Number(searchParams?.page ?? '1'))
  const offset = (currentPage - 1) * PER_PAGE

  let items: Listing[] = []
  let total = 0
  let errorMsg: string | null = null

  try {
    const [i, t] = await Promise.all([
      fetchListingsPaged({ limit: PER_PAGE, offset }),
      countListings(),
    ])
    items = i as any
    total = t
  } catch (e: any) {
    errorMsg = String(e?.message || e)
  }

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Hlídač realit</h1>
            <p className="text-gray-600">
              {total} záznamů · stránka {currentPage}/{totalPages}
            </p>
          </div>
          <Link
            href="/api/apify/scrape-all"
            prefetch={false}
            className="px-4 py-2 rounded-xl bg-black text-white hover:opacity-90"
          >
            Načíst nové (uložit do DB)
          </Link>
        </header>

        {errorMsg && (
          <div className="rounded-xl border bg-red-50 p-4 text-red-800">
            <div className="font-semibold">Chyba při načtení dat</div>
            <div className="text-sm mt-1 break-all">{errorMsg}</div>
            <div className="text-sm mt-2">
              Zkus otevřít <a className="underline" href="/api/health">/api/health</a> pro diagnostiku.
            </div>
          </div>
        )}

        {!errorMsg && (
          <>
            <Pagination currentPage={currentPage} totalPages={totalPages} />

            {/* GRID KARTIČKY */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {items.map((l) => {
                const offer = extractOffer(l.title || '')
                const addr  = l.address || l.location || ''
                return (
                  <a
                    href={`/listing/${l.id}`}
                    key={l.id}
                    className="group bg-white rounded-2xl border shadow-sm hover:shadow-md transition overflow-hidden flex flex-col"
                  >
                    <div className="relative w-full h-48 bg-gray-100">
                      {l.image_url ? (
                        <img
                          src={l.image_url}
                          alt={l.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : null}
                    </div>
                    <div className="p-4">
                      <div className="font-semibold line-clamp-1">{offer}</div>
                      <div className="text-sm text-gray-700 line-clamp-1">{addr}</div>
                      <div className="mt-2 text-xs text-gray-500">
                        {l.source.toUpperCase()} · {new Date(l.first_seen).toLocaleDateString('cs-CZ')}
                      </div>
                    </div>
                  </a>
                )
              })}
            </div>

            {items.length === 0 && (
              <div className="text-gray-600">Zatím žádné záznamy. Klikni na „Načíst nové (uložit do DB)“.</div>
            )}

            <Pagination currentPage={currentPage} totalPages={totalPages} />
          </>
        )}
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