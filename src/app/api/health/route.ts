import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
export const dynamic = 'force-dynamic'
export async function GET() {
  try {
    const r = await pool.query('SELECT NOW() as now')
    return NextResponse.json({ ok: true, db: 'connected', now: r.rows[0].now })
  } catch (e:any) {
    return NextResponse.json({ ok:false, db:'error', error: String(e?.message||e) }, { status: 500 })
  }
}