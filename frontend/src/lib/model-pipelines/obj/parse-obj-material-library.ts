import { type ProjectionMaterialDefinition } from '@/lib/model-pipelines/projection-model'

export type ParsedObjMaterialLibrary = {
  materials: ProjectionMaterialDefinition[]
  warnings: string[]
}

const clampUnit = (value: number) => Math.min(1, Math.max(0, value))

const toHexColor = (values: number[]) => {
  const channel = (value: number) => Math.round(clampUnit(value) * 255)
    .toString(16)
    .padStart(2, '0')
  return `#${channel(values[0] ?? 1)}${channel(values[1] ?? 1)}${channel(values[2] ?? 1)}`
}

export const parseObjMaterialLibrary = (source: string): ParsedObjMaterialLibrary => {
  const materials: ProjectionMaterialDefinition[] = []
  const warnings: string[] = []
  let current: ProjectionMaterialDefinition | null = null

  source.split(/\r?\n/).forEach((rawLine, lineIndex) => {
    const line = rawLine.split('#')[0].trim()
    if (!line) {
      return
    }

    const parts = line.split(/\s+/)
    const command = parts[0].toLowerCase()

    if (command === 'newmtl') {
      const name = parts.slice(1).join(' ').trim()
      if (!name) {
        warnings.push(`Ignored unnamed MTL material on line ${lineIndex + 1}`)
        current = null
        return
      }
      current = {
        name,
        color: '#ffffff',
        opacity: 1,
        roughness: 0.65,
        emissive: '#000000'
      }
      materials.push(current)
      return
    }

    if (!current) {
      return
    }

    if (command === 'kd' || command === 'ke') {
      const values = parts.slice(1, 4).map(Number)
      if (values.length === 3 && values.every(Number.isFinite)) {
        if (command === 'kd') {
          current.color = toHexColor(values)
        } else {
          current.emissive = toHexColor(values)
        }
      }
      return
    }

    if (command === 'd' || command === 'tr') {
      const value = Number(parts[1])
      if (Number.isFinite(value)) {
        current.opacity = clampUnit(command === 'tr' ? 1 - value : value)
      }
      return
    }

    if (command === 'ns') {
      const shininess = Number(parts[1])
      if (Number.isFinite(shininess) && shininess >= 0) {
        current.roughness = clampUnit(Math.sqrt(2 / (shininess + 2)))
      }
      return
    }

    if (command === 'map_kd') {
      const uri = parts.at(-1)
      if (uri) {
        current.mapUri = uri.replace(/\\/g, '/')
      }
    }
  })

  return { materials, warnings }
}
