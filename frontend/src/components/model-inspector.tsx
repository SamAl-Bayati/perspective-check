import { Box, PanelRightOpen } from 'lucide-react'

import { ModelMaterialSettingsPanel } from '@/components/model-material-settings-panel'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { type ModelViewerSettings } from '@/constants/model-materials'
import { type ProjectionModelAsset } from '@/lib/model-viewer/projection-model-asset'
import { cn } from '@/lib/utils'

type ModelInspectorProps = {
  className?: string
  idPrefix: string
  model: ProjectionModelAsset
  settings: ModelViewerSettings
  onChange: (settings: ModelViewerSettings) => void
}

function ModelInspectorContent({
  className,
  idPrefix,
  model,
  settings,
  onChange
}: ModelInspectorProps) {
  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      <div className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Box className="size-4 shrink-0 text-muted-foreground" />
          <h2 className="min-w-0 flex-1 truncate text-sm font-semibold" title={model.name}>
            {model.name}
          </h2>
          <span className="rounded border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {model.format}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Active model properties</p>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="grid gap-5 p-4">
          <ModelMaterialSettingsPanel
            idPrefix={idPrefix}
            model={model}
            settings={settings}
            onChange={onChange}
          />
          <section className="grid gap-2 border-t pt-4 text-xs text-muted-foreground">
            <h3 className="font-semibold text-foreground">Model information</h3>
            <div className="flex justify-between gap-3">
              <span>Geometry</span>
              <span className="text-right tabular-nums">
                {model.stats.vertices.toLocaleString()} vertices<br />
                {model.stats.triangles.toLocaleString()} triangles
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Resources</span>
              <span className="text-right tabular-nums">
                {model.stats.materials} materials, {model.stats.textures} textures
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Load time</span>
              <span className="tabular-nums">{model.stats.loadTimeMs.toFixed(1)} ms</span>
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  )
}

export function ModelInspector(props: Omit<ModelInspectorProps, 'idPrefix'>) {
  return (
    <aside
      aria-label="Model inspector"
      className={cn('hidden w-80 shrink-0 border-l bg-background lg:flex', props.className)}
    >
      <ModelInspectorContent {...props} idPrefix="desktop-model" />
    </aside>
  )
}

export function MobileModelInspector(props: Omit<ModelInspectorProps, 'idPrefix'>) {
  return (
    <Sheet>
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="bg-background/95 lg:hidden"
              aria-label="Open model inspector"
            >
              <PanelRightOpen className="size-4" />
            </Button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent>Model inspector</TooltipContent>
      </Tooltip>
      <SheetContent className="gap-0 p-0" aria-label="Model inspector">
        <SheetHeader className="sr-only">
          <SheetTitle>Model inspector</SheetTitle>
          <SheetDescription>Surface and material properties for the active model</SheetDescription>
        </SheetHeader>
        <ModelInspectorContent {...props} idPrefix="mobile-model" />
      </SheetContent>
    </Sheet>
  )
}
