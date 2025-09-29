'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

type Item = {
  id: number
  source: string
  title: string
  price: string
  location: string
  image_url: string | null
  url: string
  first_seen: string
}

export default function Page() {
  const [items, setItems] = useState<Item[]>([])
  const [source, setSource] = useState('')
  const [q, setQ] = useState('')

  async function load() {
    const params = new URLSearchParams()
    if (source) params.set('source', source)
    if (q) params.set('q', q)
    const res = await fetch('/api/listings?' + params.toString(), { cache: 'no-store' })
    const json = await res.json()
    setItems(json.items)
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <form className="form" onSubmit={(e) => { e.preventDefault(); load() }}>
        <label>Zdroj:&nbsp;
          <select value={source} onChange={e=>setSource(e.target.value)}>
            <option value="">Vše</option>
            <option value="sreality">Sreality</option>
            <option value="bezrealitky">Bezrealitky</option>
          </select>
        </label>
        <input className="input" placeholder="Hledat v názvu/lokalitě…" value={q} onChange={e=>setQ(e.target.value)} />
        <button type="submit">Filtrovat</button>
      </form>

      <div className="grid">
        {items.map(row => (
          <div key={row.id} className="card">
            {row.image_url ? (
              <Image src={row.image_url} alt="foto" width={640} height={360} />
            ) : (
              <Image src={`https://via.placeholder.com/640x360?text=Foto+n/a`} alt="foto" width={640} height={360} />
            )}
            <div style={{ padding: 12 }}>
              <div><span className="badge">{row.source}</span></div>
              <div className="price">{row.price || '—'}</div>
              <div className="loc">{row.location || '—'}</div>
              <div className="title"><a href={row.url} target="_blank" rel="noopener">Otevřít detail</a></div>
              <div className="meta">Zachyceno: {row.first_seen}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
