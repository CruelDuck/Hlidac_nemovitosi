import { Pool } from 'pg'

const conn = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL
if (!conn) {
  throw new Error('Missing SUPABASE_DB_URL or DATABASE_URL')
}

export const pool = new Pool({
  connectionString: conn,
  ssl: conn.includes('sslmode=no-verify')
    ? { rejectUnauthorized: false }
    : conn.includes('sslmode=require')
    ? { rejectUnauthorized: true }
    : undefined,
})

export type DbListing = {
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

export async function ensureSchema() {
  // základní tabulka
  await pool.query(`
    CREATE TABLE IF NOT EXISTS listings (
      id BIGSERIAL PRIMARY KEY,
      source TEXT NOT NULL,
      title  TEXT NOT NULL,
      price  TEXT,           -- BACKWARD COMPAT (původní sloupec)
      location TEXT,         -- BACKWARD COMPAT
      image_url TEXT,
      url TEXT UNIQUE NOT NULL,
      first_seen timestamptz NOT NULL DEFAULT now()
    );
  `)
  // nové sloupce – přidáme, pokud chybí
  await pool.query(`ALTER TABLE listings ADD COLUMN IF NOT EXISTS price_text TEXT;`)
  await pool.query(`ALTER TABLE listings ADD COLUMN IF NOT EXISTS price_num NUMERIC;`)
  await pool.query(`ALTER TABLE listings ADD COLUMN IF NOT EXISTS address   TEXT;`)

  // indexy
  await pool.query(`CREATE INDEX IF NOT EXISTS listings_first_seen_idx ON listings (first_seen DESC);`)
  await pool.query(`CREATE INDEX IF NOT EXISTS listings_source_idx     ON listings (source);`)
}

/**
 * Upsert pro 1 položku – vrací true/false podle toho, zda došlo k INSERTu (xmax=0 hack).
 */
async function upsertOne(it: {
  source: DbListing['source']
  title: string
  price_text: string | null
  price_num: number | null
  address: string | null
  location: string | null
  image_url: string | null
  url: string
}) {
  const q = `
    INSERT INTO listings (source, title, price_text, price_num, address, location, image_url, url, price)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8, $3) -- price_text zapisujeme i do legacy "price"
    ON CONFLICT (url) DO UPDATE SET
      source     = EXCLUDED.source,
      title      = COALESCE(EXCLUDED.title, listings.title),
      price_text = COALESCE(EXCLUDED.price_text, listings.price_text),
      price_num  = COALESCE(EXCLUDED.price_num, listings.price_num),
      address    = COALESCE(EXCLUDED.address, listings.address),
      location   = COALESCE(EXCLUDED.location, listings.location),
      image_url  = COALESCE(EXCLUDED.image_url, listings.image_url),
      price      = COALESCE(EXCLUDED.price_text, listings.price)
    RETURNING id, (xmax = 0) AS inserted;
  `
  const { rows } = await pool.query(q, [
    it.source, it.title, it.price_text, it.price_num, it.address, it.location, it.image_url, it.url,
  ])
  const row = rows[0]
  return { id: row.id as number, inserted: !!row.inserted }
}

export async function upsertListingsReturnNew(items: Array<{
  source: DbListing['source']
  title: string
  price_text: string | null
  price_num: number | null
  address: string | null
  location: string | null
  image_url: string | null
  url: string
}>) {
  if (!items.length) return [] as number[]
  const ids: number[] = []
  for (const it of items) {
    try {
      const res = await upsertOne(it)
      if (res.inserted) ids.push(res.id)
    } catch (_) {}
  }
  return ids
}

export async function fetchListingsPaged(opts: { limit: number; offset: number }) {
  const { limit, offset } = opts
  const { rows } = await pool.query<DbListing>(`
    SELECT
      id, source, title,
      COALESCE(price_text, price) AS price_text,
      price_num,
      address,
      COALESCE(address, location) AS location,
      image_url, url,
      to_char(first_seen at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as first_seen
    FROM listings
    ORDER BY first_seen DESC
    LIMIT $1 OFFSET $2
  `, [limit, offset])
  return rows
}

export async function countListings() {
  const { rows } = await pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM listings`)
  return Number(rows[0]?.count ?? 0)
}

export async function fetchListingById(id: number) {
  const { rows } = await pool.query<DbListing>(`
    SELECT
      id, source, title,
      COALESCE(price_text, price) AS price_text,
      price_num,
      address,
      COALESCE(address, location) AS location,
      image_url, url,
      to_char(first_seen at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as first_seen
    FROM listings
    WHERE id=$1
    LIMIT 1
  `, [id])
  return rows[0] || null
}
