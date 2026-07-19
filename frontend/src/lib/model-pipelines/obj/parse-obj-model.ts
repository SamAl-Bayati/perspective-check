import { ShapeUtils, Vector2 } from 'three'

import {
  type ModelEdge,
  type ModelVertex,
  type ProjectionMaterialDefinition,
  type ProjectionMeshPrimitive,
  type ProjectionModel
} from '@/lib/model-pipelines/projection-model'
import {
  addUniqueEdge,
  createIndexArray,
  flattenEdges,
  flattenVertices,
  getUndirectedEdgeKey,
  isDegenerateTriangle
} from '@/lib/model-pipelines/projection-model-utils'
import { parseObjMaterialLibrary } from '@/lib/model-pipelines/obj/parse-obj-material-library'

type ObjVertexReference = {
  position: number
  uv: number | null
  normal: number | null
}

type ObjRelatedTextFile = {
  uri: string
  source: string
}

type PrimitiveBuilder = {
  name: string
  materialName?: string
  positions: number[]
  normals: number[]
  uvs: number[]
  indices: number[]
  vertexLookup: Map<string, number>
  hasCompleteNormals: boolean
  hasCompleteUvs: boolean
}

const getLineContent = (line: string) => line.split('#')[0].trim()

const parseFiniteNumber = (value: string) => {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

const resolveIndex = (
  rawValue: string | undefined,
  count: number,
  lineNumber: number,
  label: string,
  optional = false
) => {
  if (!rawValue && optional) {
    return null
  }
  const rawIndex = Number(rawValue)
  if (!Number.isInteger(rawIndex) || rawIndex === 0) {
    throw new Error(`OBJ ${label} on line ${lineNumber} includes an invalid index`)
  }
  const index = rawIndex > 0 ? rawIndex - 1 : count + rawIndex
  if (index < 0 || index >= count) {
    throw new Error(`OBJ ${label} on line ${lineNumber} references a missing value`)
  }
  return index
}

const parseVertexReference = (
  token: string,
  counts: { positions: number, uvs: number, normals: number },
  lineNumber: number
): ObjVertexReference => {
  const [position, uv, normal] = token.split('/')
  return {
    position: resolveIndex(position, counts.positions, lineNumber, 'face') as number,
    uv: resolveIndex(uv, counts.uvs, lineNumber, 'texture coordinate', true),
    normal: resolveIndex(normal, counts.normals, lineNumber, 'normal', true)
  }
}

const getPolygonNormal = (points: ModelVertex[]): ModelVertex => {
  const normal: ModelVertex = [0, 0, 0]
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length]
    normal[0] += (point[1] - next[1]) * (point[2] + next[2])
    normal[1] += (point[2] - next[2]) * (point[0] + next[0])
    normal[2] += (point[0] - next[0]) * (point[1] + next[1])
  })
  return normal
}

const triangulateFace = (references: ObjVertexReference[], positions: ModelVertex[]) => {
  if (references.length === 3) {
    return [[0, 1, 2] as [number, number, number]]
  }

  const points = references.map((reference) => positions[reference.position])
  const normal = getPolygonNormal(points)
  const dominantAxis = normal
    .map((value) => Math.abs(value))
    .reduce((best, value, index, values) => value > values[best] ? index : best, 0)
  const projected = points.map((point) => {
    if (dominantAxis === 0) {
      return new Vector2(point[1], point[2])
    }
    if (dominantAxis === 1) {
      return new Vector2(point[0], point[2])
    }
    return new Vector2(point[0], point[1])
  })

  return (ShapeUtils.triangulateShape(projected, []) as [number, number, number][])
    .map(([a, b, c]) => {
      const pointA = points[a]
      const pointB = points[b]
      const pointC = points[c]
      const ab = pointB.map((value, index) => value - pointA[index])
      const ac = pointC.map((value, index) => value - pointA[index])
      const cross = [
        ab[1] * ac[2] - ab[2] * ac[1],
        ab[2] * ac[0] - ab[0] * ac[2],
        ab[0] * ac[1] - ab[1] * ac[0]
      ]
      const dot = cross.reduce((sum, value, index) => sum + value * normal[index], 0)
      return dot < 0 ? [a, c, b] : [a, b, c]
    }) as [number, number, number][]
}

const createPrimitiveBuilder = (name: string, materialName?: string): PrimitiveBuilder => ({
  name,
  materialName,
  positions: [],
  normals: [],
  uvs: [],
  indices: [],
  vertexLookup: new Map(),
  hasCompleteNormals: true,
  hasCompleteUvs: true
})

const appendRenderVertex = (
  builder: PrimitiveBuilder,
  reference: ObjVertexReference,
  smoothingGroup: string,
  faceId: number,
  positions: ModelVertex[],
  uvs: [number, number][],
  normals: ModelVertex[],
  validNormals: boolean[]
) => {
  const smoothingKey = smoothingGroup === 'off' ? `face:${faceId}` : `smooth:${smoothingGroup}`
  const key = `${reference.position}/${reference.uv ?? ''}/${reference.normal ?? ''}/${smoothingKey}`
  const existing = builder.vertexLookup.get(key)
  if (existing !== undefined) {
    return existing
  }

  const index = builder.positions.length / 3
  builder.positions.push(...positions[reference.position])
  if (reference.normal === null || !validNormals[reference.normal]) {
    builder.hasCompleteNormals = false
    builder.normals.push(0, 0, 0)
  } else {
    builder.normals.push(...normals[reference.normal])
  }
  if (reference.uv === null) {
    builder.hasCompleteUvs = false
    builder.uvs.push(0, 0)
  } else {
    builder.uvs.push(...uvs[reference.uv])
  }
  builder.vertexLookup.set(key, index)
  return index
}

const buildMaterialDefinitions = (
  libraryNames: string[],
  relatedFiles: ObjRelatedTextFile[]
) => {
  const warnings: string[] = []
  const materials = new Map<string, ProjectionMaterialDefinition>()

  libraryNames.forEach((libraryName) => {
    const normalizedName = libraryName.replace(/\\/g, '/')
    const file = relatedFiles.find((candidate) =>
      candidate.uri === libraryName ||
      candidate.uri.replace(/\\/g, '/') === normalizedName ||
      candidate.uri.split('/').at(-1) === normalizedName.split('/').at(-1)
    )
    if (!file) {
      warnings.push(`Missing OBJ material library: ${libraryName}`)
      return
    }

    const parsed = parseObjMaterialLibrary(file.source)
    parsed.materials.forEach((material) => materials.set(material.name, material))
    warnings.push(...parsed.warnings)
  })

  return { materials: Array.from(materials.values()), warnings }
}

export const parseObjModel = (
  source: string,
  name: string,
  relatedFiles: ObjRelatedTextFile[] = []
): ProjectionModel => {
  const positions: ModelVertex[] = []
  const uvs: [number, number][] = []
  const normals: ModelVertex[] = []
  const validNormals: boolean[] = []
  const edges = new Map<string, ModelEdge>()
  const faceCountByEdge = new Map<string, number>()
  const builders = new Map<string, PrimitiveBuilder>()
  const libraryNames: string[] = []
  const warnings: string[] = []
  let activeMaterial: string | undefined
  let activeObject = name
  let smoothingGroup = 'off'
  let faceId = 0
  let triangleCount = 0
  let degenerateTriangleCount = 0

  const getBuilder = () => {
    const key = `${activeObject}\u0000${activeMaterial ?? ''}`
    let builder = builders.get(key)
    if (!builder) {
      builder = createPrimitiveBuilder(activeObject, activeMaterial)
      builders.set(key, builder)
    }
    return builder
  }

  source.split(/\r?\n/).forEach((line, lineIndex) => {
    const content = getLineContent(line)
    if (!content) {
      return
    }
    const parts = content.split(/\s+/)
    const command = parts[0].toLowerCase()
    const lineNumber = lineIndex + 1

    if (command === 'v') {
      const values = parts.slice(1, 4).map(parseFiniteNumber)
      if (values.length !== 3 || values.some((value) => value === null)) {
        throw new Error(`OBJ vertex on line ${lineNumber} must include finite x, y, and z values`)
      }
      positions.push(values as ModelVertex)
      return
    }

    if (command === 'vt') {
      const values = parts.slice(1, 3).map(parseFiniteNumber)
      if (values.length < 2 || values.some((value) => value === null)) {
        throw new Error(`OBJ texture coordinate on line ${lineNumber} is invalid`)
      }
      uvs.push(values as [number, number])
      return
    }

    if (command === 'vn') {
      const values = parts.slice(1, 4).map(parseFiniteNumber)
      if (values.length !== 3 || values.some((value) => value === null)) {
        normals.push([0, 0, 0])
        validNormals.push(false)
        warnings.push(`Ignored invalid OBJ normal on line ${lineNumber}`)
        return
      }
      const normal = values as ModelVertex
      const lengthSquared = normal.reduce((sum, value) => sum + value * value, 0)
      normals.push(normal)
      validNormals.push(lengthSquared > Number.EPSILON)
      if (lengthSquared <= Number.EPSILON) {
        warnings.push(`Ignored zero-length OBJ normal on line ${lineNumber}`)
      }
      return
    }

    if (command === 'mtllib') {
      libraryNames.push(...parts.slice(1))
      return
    }
    if (command === 'usemtl') {
      activeMaterial = parts.slice(1).join(' ').trim() || undefined
      return
    }
    if (command === 'o' || command === 'g') {
      activeObject = parts.slice(1).join(' ').trim() || name
      return
    }
    if (command === 's') {
      smoothingGroup = parts[1]?.toLowerCase() === 'off' || parts[1] === '0'
        ? 'off'
        : parts[1] ?? '1'
      return
    }

    if (command === 'f') {
      const references = parts.slice(1).map((token) => parseVertexReference(token, {
        positions: positions.length,
        uvs: uvs.length,
        normals: normals.length
      }, lineNumber))
      if (references.length < 3) {
        throw new Error(`OBJ face on line ${lineNumber} must reference at least three vertices`)
      }

      references.forEach((reference, index) => {
        addUniqueEdge(
          edges,
          reference.position,
          references[(index + 1) % references.length].position
        )
      })

      const triangles = triangulateFace(references, positions)
      if (triangles.length === 0) {
        warnings.push(`Skipped untriangulatable OBJ face on line ${lineNumber}`)
        return
      }
      const builder = getBuilder()
      triangles.forEach((triangle) => {
        const trianglePoints = triangle.map((faceVertexIndex) =>
          positions[references[faceVertexIndex].position]
        ) as [ModelVertex, ModelVertex, ModelVertex]
        if (isDegenerateTriangle(trianglePoints)) {
          degenerateTriangleCount += 1
          return
        }
        const sourceIndices = triangle.map((faceVertexIndex) =>
          references[faceVertexIndex].position
        ) as [number, number, number]
        const triangleEdges = [
          [sourceIndices[0], sourceIndices[1]],
          [sourceIndices[1], sourceIndices[2]],
          [sourceIndices[2], sourceIndices[0]]
        ]
        triangleEdges.forEach(([start, end]) => {
          const edgeKey = getUndirectedEdgeKey(start, end)
          faceCountByEdge.set(edgeKey, (faceCountByEdge.get(edgeKey) ?? 0) + 1)
        })
        triangle.forEach((faceVertexIndex) => {
          builder.indices.push(appendRenderVertex(
            builder,
            references[faceVertexIndex],
            smoothingGroup,
            faceId,
            positions,
            uvs,
            normals,
            validNormals
          ))
        })
        triangleCount += 1
      })
      faceId += 1
      return
    }

    if (command === 'l') {
      const linePositions = parts.slice(1).map((token) =>
        resolveIndex(token.split('/')[0], positions.length, lineNumber, 'line') as number
      )
      linePositions.slice(1).forEach((positionIndex, index) => {
        addUniqueEdge(edges, linePositions[index], positionIndex)
      })
    }
  })

  if (positions.length === 0) {
    throw new Error('OBJ file does not contain any vertices')
  }
  if (triangleCount === 0 && edges.size === 0) {
    throw new Error('OBJ file does not contain any faces or lines to render')
  }

  const meshes: ProjectionMeshPrimitive[] = Array.from(builders.values())
    .filter((builder) => builder.indices.length > 0)
    .map((builder) => ({
      name: builder.name,
      materialName: builder.materialName,
      positions: new Float32Array(builder.positions),
      indices: createIndexArray(builder.indices, builder.positions.length / 3),
      normals: builder.hasCompleteNormals ? new Float32Array(builder.normals) : undefined,
      uvs: builder.hasCompleteUvs ? new Float32Array(builder.uvs) : undefined
    }))
  const parsedMaterials = buildMaterialDefinitions(libraryNames, relatedFiles)
  const nonManifoldEdgeCount = Array.from(faceCountByEdge.values())
    .filter((faceCount) => faceCount > 2).length
  if (degenerateTriangleCount > 0) {
    warnings.push(`Skipped ${degenerateTriangleCount} degenerate OBJ triangle${degenerateTriangleCount === 1 ? '' : 's'}`)
  }
  if (nonManifoldEdgeCount > 0) {
    warnings.push(`OBJ contains ${nonManifoldEdgeCount} non-manifold edge${nonManifoldEdgeCount === 1 ? '' : 's'}`)
  }

  return {
    name,
    format: 'obj',
    meshes,
    wireframe: {
      positions: flattenVertices(positions),
      indices: createIndexArray(flattenEdges(Array.from(edges.values())), positions.length)
    },
    materials: parsedMaterials.materials,
    warnings: [...warnings, ...parsedMaterials.warnings],
    sourceVertexCount: positions.length,
    triangleCount
  }
}
