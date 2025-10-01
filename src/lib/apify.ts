export async function runApifyActor(actorId: string, input: any = {}) {
  const token = process.env.APIFY_TOKEN
  if (!token) throw new Error('APIFY_TOKEN missing')

  const runUrl = new URL(`https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items`)
  runUrl.searchParams.set('token', token)

  const res = await fetch(runUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input || {}),
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Apify ${actorId} ${res.status} ${res.statusText}: ${text}`)
  }

  const data = await res.json().catch(() => [])
  return Array.isArray(data) ? data : []
}
