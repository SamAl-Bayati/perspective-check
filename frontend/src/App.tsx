import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { PerspectiveProjectionCanvas } from '@/components/perspective-projection-canvas'

function App() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Perspective Projection</CardTitle>
          <CardDescription>
            Canvas wireframe cube using the same projection base from your tested
            portfolio implementation. Drag to rotate and release to keep spin inertia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border bg-muted/20">
            <PerspectiveProjectionCanvas className="h-[68vh] min-h-[420px] w-full touch-none cursor-grab active:cursor-grabbing" />
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

export default App
