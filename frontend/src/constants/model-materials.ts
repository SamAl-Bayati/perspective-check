export type MaterialMode = 'original' | 'default' | 'palette'
export type SurfaceShading = 'flat' | 'smooth'
export type WireframeStyle = 'solid' | 'dashed'

export type DefaultMaterialSettings = {
  baseColor: string
  opacity: number
  metalness: number
  roughness: number
  emissiveColor: string
  emissiveIntensity: number
  doubleSided: boolean
  shading: SurfaceShading
}

export type ModelViewerSettings = {
  solidVisible: boolean
  wireframeVisible: boolean
  wireframeStyle: WireframeStyle
  materialMode: MaterialMode
  paletteColorId: string
  defaultMaterial: DefaultMaterialSettings
}

export const MODEL_MATERIAL_PALETTE = [
  { id: 'neutral', label: 'Neutral', color: '#e7e7e7' },
  { id: 'primary', label: 'Purple', color: '#9f84bd' },
  { id: 'coral', label: 'Coral', color: '#e26d5c' },
  { id: 'teal', label: 'Teal', color: '#429ea6' },
  { id: 'slate', label: 'Slate', color: '#64748b' },
  { id: 'gold', label: 'Gold', color: '#c59b45' }
] as const

export const DEFAULT_MATERIAL_SETTINGS: DefaultMaterialSettings = {
  baseColor: '#e7e7e7',
  opacity: 1,
  metalness: 0,
  roughness: 0.65,
  emissiveColor: '#000000',
  emissiveIntensity: 1,
  doubleSided: false,
  shading: 'smooth'
}

export const DEFAULT_MODEL_VIEWER_SETTINGS: ModelViewerSettings = {
  solidVisible: true,
  wireframeVisible: true,
  wireframeStyle: 'solid',
  materialMode: 'default',
  paletteColorId: MODEL_MATERIAL_PALETTE[0].id,
  defaultMaterial: DEFAULT_MATERIAL_SETTINGS
}

export const getPaletteColor = (paletteColorId: string) =>
  MODEL_MATERIAL_PALETTE.find((entry) => entry.id === paletteColorId)?.color ??
  MODEL_MATERIAL_PALETTE[0].color
