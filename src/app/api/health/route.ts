import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'

function redact(url?: string | null) {
  if (!url) return null
  try {
    const u = new URL(url)
    // zamlčíme heslo
    return {
      protocol: u.protocol,
      hostname: u.hostname,
      port: u.port,
      pathname: u.pathname,
      search: u.search,
      hasPassword: !!u.password
    }
  } catch {
    return { raw: url }
  }
}

export async function GET() {
  const envUrl = process.env.SUPABASE_DB_URL || null
  try {
    const r = await pool.query('SELECT NOW() as now')
    return NextResponse.json({
      ok: true,
      db: 'connected',
      now: r.rows[0].now,
      using: redact(envUrl)
    })
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      db: 'error',
      error: String(e?.message || e),
      using: redact(envUrl)
    }, { status: 500 })
  }
}