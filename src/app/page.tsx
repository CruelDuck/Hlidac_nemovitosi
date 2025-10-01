import ErrorBoundary from '@/components/ErrorBoundary'
import ManualScraper from '@/components/ManualScraper'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto py-6">
        <h1 className="text-2xl font-bold mb-2">Hlídač realitních inzerátů</h1>
        <p className="text-gray-600 mb-6">
          Klikni na <b>Aktualizovat teď</b> pro ruční načtení nových inzerátů. Automat přidáme později.
        </p>
        <ErrorBoundary>
          <ManualScraper />
        </ErrorBoundary>
      </div>
    </main>
  )
}
