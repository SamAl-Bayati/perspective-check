import { useEffect, useState } from 'react'
import { apiBaseUrl } from './config'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'

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
      <Card>
        <CardHeader>
          <CardTitle>PerspectiveCheck</CardTitle>
          <CardDescription>
            Inspect 3D model files in a lightweight web app foundation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="text-lg font-medium">Functional Scope</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                <li>Frontend placeholder with API health check wiring</li>
                <li>Backend health endpoint for readiness checks</li>
                <li>AWS infra skeleton for Amplify and Lambda + API Gateway</li>
                <li>Planned support for STL, 3MF, OBJ, FBX, glTF, and GLB workflows</li>
                <li>CI checks for lint, typecheck, build, tests, and infra validation</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-medium">Non Functional Goals</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                <li>Performance-first defaults and minimal runtime dependencies</li>
                <li>Simple deployment path to AWS services</li>
                <li>Deterministic local setup and quality gates</li>
                <li>No hardcoded secrets in source control</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 rounded-xl border bg-muted/30 p-4">
            <label className="text-sm font-medium">API base URL</label>
            <Input readOnly value={apiBaseUrl} className="mt-2 font-mono text-xs" />
            <div className="mt-3">
              <Badge variant={statusConfig[state].variant}>{statusConfig[state].label}</Badge>
            </div>
            {details ? <p className="mt-3 text-xs text-muted-foreground">{details}</p> : null}
            <Button type="button" onClick={() => void checkHealth()} className="mt-4">
              Re-check Backend Health
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

export default App
