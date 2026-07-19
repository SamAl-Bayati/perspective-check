import { Box, Network, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { type ModelViewerSettings, type WireframeStyle } from '@/constants/model-materials'
import { type ProjectionModelAsset } from '@/lib/model-viewer/projection-model-asset'

type ViewportToolbarProps = {
  disabled: boolean
  model: ProjectionModelAsset
  settings: ModelViewerSettings
  onChange: (settings: ModelViewerSettings) => void
  onImport: () => void
}

export function ViewportToolbar({
  disabled,
  model,
  settings,
  onChange,
  onImport
}: ViewportToolbarProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border bg-card/95 p-1 shadow-md backdrop-blur">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onImport}
            disabled={disabled}
            aria-label={disabled ? 'Loading 3D model' : 'Import 3D model'}
          >
            <Plus className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{disabled ? 'Loading model' : 'Import model'}</TooltipContent>
      </Tooltip>

      <span aria-hidden="true" className="mx-1 h-6 w-px bg-border" />

      {model.hasSurfaces ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={settings.solidVisible ? 'secondary' : 'ghost'}
              size="icon"
              aria-label={settings.solidVisible ? 'Hide solid mesh' : 'Show solid mesh'}
              aria-pressed={settings.solidVisible}
              onClick={() => onChange({ ...settings, solidVisible: !settings.solidVisible })}
            >
              <Box className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{settings.solidVisible ? 'Hide solid mesh' : 'Show solid mesh'}</TooltipContent>
        </Tooltip>
      ) : null}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={settings.wireframeVisible ? 'secondary' : 'ghost'}
            size="icon"
            aria-label={settings.wireframeVisible ? 'Hide feature edges' : 'Show feature edges'}
            aria-pressed={settings.wireframeVisible}
            onClick={() => onChange({ ...settings, wireframeVisible: !settings.wireframeVisible })}
          >
            <Network className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {settings.wireframeVisible ? 'Hide feature edges' : 'Show feature edges'}
        </TooltipContent>
      </Tooltip>

      {settings.wireframeVisible ? (
        <Select
          value={settings.wireframeStyle}
          onValueChange={(wireframeStyle) => onChange({
            ...settings,
            wireframeStyle: wireframeStyle as WireframeStyle
          })}
        >
          <SelectTrigger className="h-9 w-[92px] border-0 bg-transparent shadow-none" aria-label="Edge style">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="solid">Solid edges</SelectItem>
            <SelectItem value="dashed">Dashed</SelectItem>
          </SelectContent>
        </Select>
      ) : null}
    </div>
  )
}
