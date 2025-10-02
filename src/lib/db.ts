import { Pool } from 'pg'

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

const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
})

export async function ensureSchema() {
  await pool.query(`
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
  `)
}
export async function fetchListingsPaged(opts: { limit: number; offset: number }) {
  const { limit, offset } = opts
  const { rows } = await pool.query(
    `SELECT id, source, title, price, location, image_url, url,
            to_char(first_seen at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as first_seen
     FROM listings
     ORDER BY first_seen DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  )
  return rows
}

export async function countListings() {
  const { rows } = await pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM listings')
  return Number(rows[0]?.count ?? 0)
}
export async function upsertListingsReturnNew(
  items: Omit<DbListing, 'id' | 'first_seen'>[]
) {
  const inserted: Pick<DbListing, 'source' | 'title' | 'price' | 'location' | 'image_url' | 'url'>[] = []
  for (const it of items) {
    try {
      const r = await pool.query(
        `INSERT INTO listings (source, title, price, location, image_url, url)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (url) DO NOTHING
         RETURNING source, title, price, location, image_url, url;`,
        [it.source, it.title, it.price, it.location, it.image_url, it.url]
      )
      if (r.rowCount && r.rows[0]) inserted.push(r.rows[0])
    } catch {}
  }
  return inserted
}

export async function fetchListings(
  opts: { source?: string; q?: string; limit?: number } = {}
) {
  const { source, q, limit = 200 } = opts
  const clauses: string[] = []
  const params: any[] = []
  if (source) clauses.push(`source = $${params.push(source)}`)
  if (q) clauses.push(
    `(LOWER(title) LIKE $${params.push('%' + q.toLowerCase() + '%')}
     OR LOWER(location) LIKE $${params.push('%' + q.toLowerCase() + '%')})`
  )
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const { rows } = await pool.query<DbListing>(
    `SELECT id, source, title, price, location, image_url, url,
            to_char(first_seen at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as first_seen
     FROM listings ${where}
     ORDER BY first_seen DESC
     LIMIT ${limit}`,
    params
  )
  return rows
}
