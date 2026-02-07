import { useEffect, useState } from 'react'
import { apiBaseUrl } from './config'
import { Badge } from '@/components/ui/badge'

type HealthState = 'idle' | 'loading' | 'ok' | 'error'

function App() {
  const [state, setState] = useState<HealthState>('idle')
  const [details, setDetails] = useState('')

  const checkHealth = async () => {
    setState('loading')
    setDetails('')

    try {
      const response = await fetch(`${apiBaseUrl}/health`)
      const data = (await response.json()) as { ok?: boolean }

      if (!response.ok || !data.ok) {
        throw new Error(`Unexpected response: ${response.status}`)
      }

      setState('ok')
      setDetails('Connected to backend successfully')
    } catch (error) {
      setState('error')
      setDetails(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  useEffect(() => {
    void checkHealth()
  }, [])

  const statusConfig = {
    idle: { variant: 'outline', label: 'Waiting for response' },
    loading: { variant: 'warning', label: 'Checking backend' },
    ok: { variant: 'success', label: 'Connected to backend successfully' },
    error: { variant: 'destructive', label: 'Backend connection failed' }
  } as const

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Modern Webdev Template
        </h1>
        <p className="mt-3 text-slate-600">
          Reusable baseline scaffold optimized for fast iteration and low overhead.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div>
            <h2 className="text-lg font-medium text-slate-900">Functional Scope</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
              <li>Frontend placeholder with API health check wiring</li>
              <li>Backend health endpoint for readiness checks</li>
              <li>AWS infra skeleton for Amplify and Lambda + API Gateway</li>
              <li>CI checks for lint, typecheck, build, tests, and infra validation</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-medium text-slate-900">Non Functional Goals</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
              <li>Performance-first defaults and minimal runtime dependencies</li>
              <li>Simple deployment path to AWS services</li>
              <li>Deterministic local setup and quality gates</li>
              <li>No hardcoded secrets in source control</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-700">
            API base URL: <code className="font-mono text-xs">{apiBaseUrl}</code>
          </p>
          <div className="mt-3">
            <Badge variant={statusConfig[state].variant}>{statusConfig[state].label}</Badge>
          </div>
          {details ? <p className="mt-3 text-xs text-slate-600">{details}</p> : null}
          <button
            type="button"
            onClick={() => void checkHealth()}
            className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Re-check Backend Health
          </button>
        </div>
      </section>
    </main>
  )
}

export default App
