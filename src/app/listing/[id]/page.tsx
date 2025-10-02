import { notFound } from 'next/navigation'
import Link from 'next/link'
import { fetchListingById } from '@/lib/db'

export default async function ListingDetail({ params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (!Number.isFinite(id)) return notFound()

  const l = await fetchListingById(id)
  if (!l) return notFound()

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{l.title}</h1>
          <Link href="/" prefetch={false} className="text-sm text-gray-600 hover:underline">← Zpět na výpis</Link>
        </div>

        {l.image_url && (
          <img src={l.image_url} alt={l.title} className="w-full max-h-[480px] object-cover rounded-xl border" />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Info label="Adresa" value={l.address || l.location || '—'} />
          <Info label="Cena" value={l.price_text || (l.price_num ? `${l.price_num.toLocaleString('cs-CZ')} Kč` : '—')} />
          <Info label="Zdroj" value={l.source.toUpperCase()} />
          <Info label="První záznam" value={new Date(l.first_seen).toLocaleString('cs-CZ')} />
        </div>

        <div>
          <a
            href={l.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center px-4 py-2 rounded-xl bg-black text-white hover:opacity-90"
          >
            Otevřít inzerát ve zdroji
          </a>
        </div>
      </div>
    </main>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  )
}
