'use client'
import React from 'react'

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message?: string }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, message: String(error?.message || error) }
  }
  componentDidCatch(error: any, info: any) {
    // pro rychlou diagnostiku v konzoli
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="m-4 p-4 rounded-lg border bg-red-50 text-red-700">
          <div className="font-semibold mb-1">Došlo k chybě ve vykreslení.</div>
          <div className="text-sm break-all">{this.state.message}</div>
          <div className="text-xs text-gray-600 mt-1">
            Otevři DevTools → Console pro detail, ale zkusíme to teď opravit níže uvedeným tlačítkem.
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
