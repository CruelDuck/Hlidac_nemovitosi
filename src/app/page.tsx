"use client"

import useSWR from "swr"
import Link from "next/link"

type Listing = {
  id: number
  source: string
  title: string
  price_text: string | null
  address: string | null
  image_url: string | null
  url: string
  first_seen: string
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function HomePage() {
  const { data, error } = useSWR("/api/listings?page=1&limit=50", fetcher)

  if (error) return <div>Chyba při načtení dat</div>
  if (!data) return <div>Načítám...</div>

  const { listings, total, page, pages } = data

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Hlídač realit</h1>
      <p className="mb-4">
        {total} záznamů · stránka {page}/{pages}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {listings.map((item: Listing) => (
          <Link
            key={item.id}
            href={item.url}
            target="_blank"
            className="block border rounded-lg shadow hover:shadow-lg overflow-hidden"
          >
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.title}
                className="w-full h-48 object-cover"
              />
            ) : (
              <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-500">
                Bez obrázku
              </div>
            )}

            <div className="p-3">
              <h2 className="font-semibold text-sm mb-1">{item.title}</h2>
              <p className="text-gray-600 text-sm">{item.address}</p>
              {item.price_text && (
                <p className="text-blue-600 font-bold mt-1">{item.price_text}</p>
              )}
              <p className="text-xs text-gray-400 mt-2">
                {item.source} · {new Date(item.first_seen).toLocaleDateString()}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}