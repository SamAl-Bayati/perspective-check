import {
  type ModelEdge,
  type ModelVertex,
  type ProjectionModel
} from '@/lib/model-pipelines/projection-model'
import { normalizeProjectionVertices } from '@/lib/model-pipelines/projection-model-utils'

type Triangle = [number, number, number]

const BINARY_STL_HEADER_BYTES = 80
const BINARY_STL_TRIANGLE_COUNT_BYTES = 4
const BINARY_STL_TRIANGLE_BYTES = 50
const BINARY_STL_VERTEX_OFFSET = 12
const BINARY_STL_FLOAT_BYTES = 4
const TRIANGLE_VERTEX_COUNT = 3

const numberPattern = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?'
const vertexLinePattern = new RegExp(
  `^vertex\\s+(${numberPattern})\\s+(${numberPattern})\\s+(${numberPattern})\\s*$`,
  'i'
)

const getVertexKey = ([x, y, z]: ModelVertex) =>
  [x, y, z].map((coordinate) => Object.is(coordinate, -0) ? '0' : coordinate.toPrecision(12)).join(':')

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

const addTriangleEdges = (edges: Map<string, ModelEdge>, [a, b, c]: Triangle) => {
  addEdge(edges, a, b)
  addEdge(edges, b, c)
  addEdge(edges, c, a)
}

const appendVertex = (
  vertex: ModelVertex,
  vertices: ModelVertex[],
  vertexLookup: Map<string, number>
) => {
  const vertexKey = getVertexKey(vertex)
  const existingIndex = vertexLookup.get(vertexKey)

  if (existingIndex !== undefined) {
    return existingIndex
  }

  const nextIndex = vertices.length
  vertices.push(vertex)
  vertexLookup.set(vertexKey, nextIndex)
  return nextIndex
}

const buildProjectionModel = (
  name: string,
  rawTriangles: ModelVertex[][]
): ProjectionModel => {
  const vertices: ModelVertex[] = []
  const vertexLookup = new Map<string, number>()
  const edges = new Map<string, ModelEdge>()

  rawTriangles.forEach((triangle) => {
    if (triangle.length !== TRIANGLE_VERTEX_COUNT) {
      throw new Error('STL triangle must contain exactly three vertices')
    }

    const triangleIndices = triangle.map((vertex) =>
      appendVertex(vertex, vertices, vertexLookup)
    ) as Triangle

    addTriangleEdges(edges, triangleIndices)
  })

  if (vertices.length === 0 || edges.size === 0) {
    throw new Error('STL file does not contain any triangles to render')
  }

  return {
    name,
    vertices: normalizeProjectionVertices(vertices),
    edges: Array.from(edges.values())
  }
}

const parseAsciiStlModel = (source: string, name: string): ProjectionModel => {
  const vertices = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .flatMap((line) => {
      const match = vertexLinePattern.exec(line)
      if (!match) {
        return []
      }

      const vertex = match.slice(1, 4).map(Number)
      if (vertex.some((coordinate) => !Number.isFinite(coordinate))) {
        throw new Error('ASCII STL includes a vertex with invalid coordinates')
      }

      return [vertex as ModelVertex]
    })

  if (vertices.length === 0) {
    throw new Error('ASCII STL file does not contain any vertices')
  }

  if (vertices.length % TRIANGLE_VERTEX_COUNT !== 0) {
    throw new Error('ASCII STL file contains an incomplete triangle')
  }

  const triangles = Array.from(
    { length: vertices.length / TRIANGLE_VERTEX_COUNT },
    (_, index) => vertices.slice(
      index * TRIANGLE_VERTEX_COUNT,
      index * TRIANGLE_VERTEX_COUNT + TRIANGLE_VERTEX_COUNT
    )
  )

  return buildProjectionModel(name, triangles)
}

const isBinaryStl = (buffer: ArrayBuffer) => {
  if (buffer.byteLength < BINARY_STL_HEADER_BYTES + BINARY_STL_TRIANGLE_COUNT_BYTES) {
    return false
  }

  const view = new DataView(buffer)
  const triangleCount = view.getUint32(BINARY_STL_HEADER_BYTES, true)
  return (
    BINARY_STL_HEADER_BYTES +
    BINARY_STL_TRIANGLE_COUNT_BYTES +
    triangleCount * BINARY_STL_TRIANGLE_BYTES
  ) === buffer.byteLength
}

const parseBinaryStlModel = (buffer: ArrayBuffer, name: string): ProjectionModel => {
  const view = new DataView(buffer)
  const triangleCount = view.getUint32(BINARY_STL_HEADER_BYTES, true)
  const triangles = Array.from({ length: triangleCount }, (_, triangleIndex) => {
    const triangleOffset =
      BINARY_STL_HEADER_BYTES +
      BINARY_STL_TRIANGLE_COUNT_BYTES +
      triangleIndex * BINARY_STL_TRIANGLE_BYTES

    return Array.from({ length: TRIANGLE_VERTEX_COUNT }, (_, vertexIndex) => {
      const vertexOffset =
        triangleOffset +
        BINARY_STL_VERTEX_OFFSET +
        vertexIndex * TRIANGLE_VERTEX_COUNT * BINARY_STL_FLOAT_BYTES
      const vertex: ModelVertex = [
        view.getFloat32(vertexOffset, true),
        view.getFloat32(vertexOffset + BINARY_STL_FLOAT_BYTES, true),
        view.getFloat32(vertexOffset + BINARY_STL_FLOAT_BYTES * 2, true)
      ]

      if (vertex.some((coordinate) => !Number.isFinite(coordinate))) {
        throw new Error('Binary STL includes a vertex with invalid coordinates')
      }

      return vertex
    })
  })

  return buildProjectionModel(name, triangles)
}

export const parseStlModel = (buffer: ArrayBuffer, name: string): ProjectionModel => {
  if (isBinaryStl(buffer)) {
    return parseBinaryStlModel(buffer, name)
  }

  const source = new TextDecoder().decode(buffer)
  return parseAsciiStlModel(source, name)
}
