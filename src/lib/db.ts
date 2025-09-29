import { sql } from '@vercel/postgres'

export type DbListing = {
  id: number
  source: 'sreality' | 'bezrealitky'
  title: string
  price: string
  location: string
  image_url: string | null
  url: string
  first_seen: string
}

export async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS listings (
      id serial PRIMARY KEY,
      source text NOT NULL,
      title text NOT NULL,
      price text,
      location text,
      image_url text,
      url text UNIQUE NOT NULL,
      first_seen timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS listings_first_seen_idx ON listings (first_seen DESC);
    CREATE INDEX IF NOT EXISTS listings_source_idx ON listings (source);
  `
}

export async function upsertListings(items: Omit<DbListing, 'id' | 'first_seen'>[]) {
  if (!items.length) return 0
  let inserted = 0
  for (const it of items) {
    try {
      await sql`
        INSERT INTO listings (source, title, price, location, image_url, url)
        VALUES (${it.source}, ${it.title}, ${it.price}, ${it.location}, ${it.image_url}, ${it.url})
        ON CONFLICT (url) DO NOTHING;
      `
      inserted++
    } catch (_e) {}
  }
  return inserted
}

export async function fetchListings(opts: { source?: string; q?: string; limit?: number } = {}) {
  const { source, q, limit = 200 } = opts
  const clauses: string[] = []
  const params: any[] = []
  if (source) { clauses.push(`source = $${params.push(source)}`) }
  if (q) { clauses.push(`(LOWER(title) LIKE $${params.push('%'+q.toLowerCase()+'%')} OR LOWER(location) LIKE $${params.push('%'+q.toLowerCase()+'%')})`) }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const { rows } = await sql.query<DbListing>(
    `SELECT id, source, title, price, location, image_url, url,
            to_char(first_seen at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as first_seen
     FROM listings ${where}
     ORDER BY first_seen DESC
     LIMIT ${limit}`,
    params
  )
  return rows
}
