import { type ModelVertex } from '@/lib/model-pipelines/projection-model'

export const normalizeProjectionVertices = (vertices: ModelVertex[]): ModelVertex[] => {
  const bounds = vertices.reduce(
    (currentBounds, [x, y, z]) => ({
      minX: Math.min(currentBounds.minX, x),
      maxX: Math.max(currentBounds.maxX, x),
      minY: Math.min(currentBounds.minY, y),
      maxY: Math.max(currentBounds.maxY, y),
      minZ: Math.min(currentBounds.minZ, z),
      maxZ: Math.max(currentBounds.maxZ, z)
    }),
    {
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity,
      minZ: Infinity,
      maxZ: -Infinity
    }
  )
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2
  const centerZ = (bounds.minZ + bounds.maxZ) / 2
  const maxDimension = Math.max(
    bounds.maxX - bounds.minX,
    bounds.maxY - bounds.minY,
    bounds.maxZ - bounds.minZ,
    1
  )
  const scale = 2 / maxDimension

  return vertices.map(([x, y, z]) => [
    (x - centerX) * scale,
    (y - centerY) * scale,
    (z - centerZ) * scale
  ])
}
