import {
  type ModelEdge,
  type ModelVertex,
  type ProjectionModel
} from '@/lib/model-pipelines/projection-model'
import { normalizeProjectionVertices } from '@/lib/model-pipelines/projection-model-utils'

type ObjFace = number[]

const getLineContent = (line: string) => line.split('#')[0].trim()

const parseFiniteNumber = (value: string) => {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

const parseVertexLine = (parts: string[], lineNumber: number): ModelVertex => {
  const coordinates = parts.slice(1, 4).map(parseFiniteNumber)

  if (coordinates.length < 3 || coordinates.some((coordinate) => coordinate === null)) {
    throw new Error(`OBJ vertex on line ${lineNumber} must include finite x, y, and z values`)
  }

  return coordinates as ModelVertex
}

const parseVertexReference = (
  token: string,
  vertexCount: number,
  lineNumber: number
) => {
  const rawIndex = Number(token.split('/')[0])

  if (!Number.isInteger(rawIndex) || rawIndex === 0) {
    throw new Error(`OBJ face on line ${lineNumber} includes an invalid vertex reference`)
  }

  const vertexIndex = rawIndex > 0 ? rawIndex - 1 : vertexCount + rawIndex

  if (vertexIndex < 0 || vertexIndex >= vertexCount) {
    throw new Error(`OBJ face on line ${lineNumber} references a missing vertex`)
  }

  return vertexIndex
}

const parseIndexList = (
  parts: string[],
  vertexCount: number,
  lineNumber: number
) => parts
  .slice(1)
  .map((token) => parseVertexReference(token, vertexCount, lineNumber))

const addEdge = (edges: Map<string, ModelEdge>, startIndex: number, endIndex: number) => {
  if (startIndex === endIndex) {
    return
  }

  const edgeStart = Math.min(startIndex, endIndex)
  const edgeEnd = Math.max(startIndex, endIndex)
  const edgeKey = `${edgeStart}:${edgeEnd}`

  if (!edges.has(edgeKey)) {
    edges.set(edgeKey, [edgeStart, edgeEnd])
  }
}

const addPolylineEdges = (edges: Map<string, ModelEdge>, indices: number[]) => {
  indices.slice(1).forEach((vertexIndex, index) => {
    addEdge(edges, indices[index], vertexIndex)
  })
}

const addFaceEdges = (edges: Map<string, ModelEdge>, face: ObjFace) => {
  face.forEach((vertexIndex, index) => {
    addEdge(edges, vertexIndex, face[(index + 1) % face.length])
  })
}

export const parseObjModel = (source: string, name: string): ProjectionModel => {
  const vertices: ModelVertex[] = []
  const faces: ObjFace[] = []
  const edges = new Map<string, ModelEdge>()

  source.split(/\r?\n/).forEach((line, lineIndex) => {
    const content = getLineContent(line)
    if (!content) {
      return
    }

    const parts = content.split(/\s+/)
    const lineNumber = lineIndex + 1

    if (parts[0] === 'v') {
      vertices.push(parseVertexLine(parts, lineNumber))
      return
    }

    if (parts[0] === 'f') {
      const face = parseIndexList(parts, vertices.length, lineNumber)
      if (face.length < 3) {
        throw new Error(`OBJ face on line ${lineNumber} must reference at least three vertices`)
      }

      faces.push(face)
      addFaceEdges(edges, face)
      return
    }

    if (parts[0] === 'l') {
      const indices = parseIndexList(parts, vertices.length, lineNumber)
      if (indices.length < 2) {
        throw new Error(`OBJ line on line ${lineNumber} must reference at least two vertices`)
      }

      addPolylineEdges(edges, indices)
    }
  })

  if (vertices.length === 0) {
    throw new Error('OBJ file does not contain any vertices')
  }

  if (faces.length === 0 && edges.size === 0) {
    throw new Error('OBJ file does not contain any faces or lines to render')
  }

  return {
    name,
    vertices: normalizeProjectionVertices(vertices),
    edges: Array.from(edges.values())
  }
}
