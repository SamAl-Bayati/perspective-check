import { RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  DEFAULT_MATERIAL_SETTINGS,
  MODEL_MATERIAL_PALETTE,
  type DefaultMaterialSettings,
  type MaterialMode,
  type ModelViewerSettings,
  type SurfaceShading
} from '@/constants/model-materials'
import { type ProjectionModelAsset } from '@/lib/model-viewer/projection-model-asset'
import { cn } from '@/lib/utils'

type ModelMaterialSettingsPanelProps = {
  model: ProjectionModelAsset
  settings: ModelViewerSettings
  onChange: (settings: ModelViewerSettings) => void
  idPrefix?: string
}

type NumberSettingProps = {
  id: string
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (value: number) => void
}

function NumberSetting({
  id,
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange
}: NumberSettingProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-[110px_minmax(0,1fr)_48px] sm:items-center">
      <Label htmlFor={id}>{label}</Label>
      <Slider
        id={id}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([nextValue]) => onChange(nextValue ?? value)}
      />
      <span className="text-right text-xs tabular-nums text-muted-foreground">
        {value.toFixed(2)}
      </span>
    </div>
  )
}

export function ModelMaterialSettingsPanel({
  model,
  settings,
  onChange,
  idPrefix = 'model-material'
}: ModelMaterialSettingsPanelProps) {
  const updateDefaultMaterial = (changes: Partial<DefaultMaterialSettings>) => {
    onChange({
      ...settings,
      defaultMaterial: {
        ...settings.defaultMaterial,
        ...changes
      }
    })
  }

  if (!model.hasSurfaces) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        This model contains line geometry only, so surface material controls do not apply.
      </div>
    )
  }

  return (
    <section className="grid gap-4">
        <div>
          <h3 className="text-sm font-semibold">Surface material</h3>
          <p className="text-xs text-muted-foreground">
            Palette overrides change base colour only and preserve imported PBR properties
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-center">
          <Label htmlFor={`${idPrefix}-material-mode`}>Material source</Label>
          <Select
            value={settings.materialMode}
            onValueChange={(value) => onChange({ ...settings, materialMode: value as MaterialMode })}
          >
            <SelectTrigger
              id={`${idPrefix}-material-mode`}
              className="min-w-0 [&_[data-slot=select-value]]:truncate"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {model.hasImportedMaterials ? (
                <SelectItem value="original">Original imported materials</SelectItem>
              ) : null}
              <SelectItem value="default">Neutral configurable material</SelectItem>
              <SelectItem value="palette">Palette base colour</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {settings.materialMode === 'palette' ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="Material palette">
            {MODEL_MATERIAL_PALETTE.map((entry) => (
              <button
                key={entry.id}
                type="button"
                aria-label={entry.label}
                aria-pressed={settings.paletteColorId === entry.id}
                onClick={() => onChange({ ...settings, paletteColorId: entry.id })}
                className={cn(
                  'grid justify-items-center gap-1 rounded-md border p-2 text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  settings.paletteColorId === entry.id ? 'border-primary bg-primary/10' : 'hover:bg-muted'
                )}
              >
                <span
                  className="size-7 rounded-full border border-black/20 shadow-sm"
                  style={{ backgroundColor: entry.color }}
                />
                <span>{entry.label}</span>
              </button>
            ))}
          </div>
        ) : null}

        {settings.materialMode === 'default' ? (
          <div className="grid gap-4 border-t pt-4">
            <div className="grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-center">
              <Label htmlFor={`${idPrefix}-base-color`}>Base colour</Label>
              <Input
                id={`${idPrefix}-base-color`}
                type="color"
                value={settings.defaultMaterial.baseColor}
                onChange={(event) => updateDefaultMaterial({ baseColor: event.target.value })}
                className="h-9 w-16 p-1"
              />
            </div>
            <NumberSetting
              id={`${idPrefix}-opacity`}
              label="Opacity"
              value={settings.defaultMaterial.opacity}
              onChange={(opacity) => updateDefaultMaterial({ opacity })}
            />
            <NumberSetting
              id={`${idPrefix}-metalness`}
              label="Metallic"
              value={settings.defaultMaterial.metalness}
              onChange={(metalness) => updateDefaultMaterial({ metalness })}
            />
            <NumberSetting
              id={`${idPrefix}-roughness`}
              label="Roughness"
              value={settings.defaultMaterial.roughness}
              onChange={(roughness) => updateDefaultMaterial({ roughness })}
            />
            <div className="grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-center">
              <Label htmlFor={`${idPrefix}-emissive-color`}>Emissive colour</Label>
              <Input
                id={`${idPrefix}-emissive-color`}
                type="color"
                value={settings.defaultMaterial.emissiveColor}
                onChange={(event) => updateDefaultMaterial({ emissiveColor: event.target.value })}
                className="h-9 w-16 p-1"
              />
            </div>
            <NumberSetting
              id={`${idPrefix}-emissive-intensity`}
              label="Emissive"
              value={settings.defaultMaterial.emissiveIntensity}
              max={4}
              step={0.05}
              onChange={(emissiveIntensity) => updateDefaultMaterial({ emissiveIntensity })}
            />
            <div className="grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-center">
              <Label htmlFor={`${idPrefix}-surface-shading`}>Shading</Label>
              <Select
                value={settings.defaultMaterial.shading}
                onValueChange={(value) => updateDefaultMaterial({ shading: value as SurfaceShading })}
              >
                <SelectTrigger id={`${idPrefix}-surface-shading`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="smooth">Smooth</SelectItem>
                  <SelectItem value="flat">Flat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor={`${idPrefix}-double-sided`}>Double-sided</Label>
              <Switch
                id={`${idPrefix}-double-sided`}
                checked={settings.defaultMaterial.doubleSided}
                onCheckedChange={(doubleSided) => updateDefaultMaterial({ doubleSided })}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="justify-self-start"
              onClick={() => updateDefaultMaterial({ ...DEFAULT_MATERIAL_SETTINGS })}
            >
              <RotateCcw className="size-4" />
              Reset neutral material
            </Button>
          </div>
        ) : null}
    </section>
  )
}
