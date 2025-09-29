import './globals.css'
import type { ReactNode } from 'react'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="cs">
      <body>
        <header className="px-5 py-3 bg-black text-white font-semibold">Hlídač inzerátů – MVP (Vercel)</header>
        <main className="max-w-5xl mx-auto p-4">{children}</main>
      </body>
    </html>
  )
}
