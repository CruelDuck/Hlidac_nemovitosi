"use client"
import useSWR from "swr"
import Image from "next/image"

type Listing = {
  id: number
  source: string
  title: string
  price: string
  location: string
  image_url: string | null
  url: string
  created_at: string
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function HomePage() {
  const { data, error } = useSWR<{ listings: Listing[] }>("/api/listings", fetcher, { refreshInterval: 30000 })

  if (error) return <div>Chyba načítání dat</div>
  if (!data) return <div>Načítám...</div>

  return (
    <main className="p-6 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {data.listings.length === 0 && (
        <p>Žádné inzeráty</p>
      )}
      {data.listings.map((l) => (
        <a
          key={l.id}
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-white rounded-2xl shadow hover:shadow-lg transition overflow-hidden"
        >
          {l.image_url && (
            <div className="relative h-48 w-full">
              <Image
                src={l.image_url}
                alt={l.title}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div className="p-4">
            <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">{l.source}</span>
            <h3 className="mt-2 font-semibold text-lg line-clamp-2">{l.title}</h3>
            <p className="text-green-700 font-bold">{l.price}</p>
            <p className="text-sm text-gray-500">{l.location}</p>
          </div>
        </a>
      ))}
    </main>
  )
}
