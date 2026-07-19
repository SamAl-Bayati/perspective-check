import { type ModelEdge, type ModelVertex } from '@/lib/model-pipelines/projection-model'

export const createIndexArray = (values: number[], vertexCount: number) =>
  vertexCount > 65535 ? new Uint32Array(values) : new Uint16Array(values)

export const flattenVertices = (vertices: ModelVertex[]) =>
  new Float32Array(vertices.flatMap((vertex) => vertex))

export const flattenEdges = (edges: ModelEdge[]) => edges.flatMap((edge) => edge)

export const getVertexKey = ([x, y, z]: ModelVertex) =>
  [x, y, z]
    .map((coordinate) => Object.is(coordinate, -0) ? '0' : String(coordinate))
    .join(':')

export const getUndirectedEdgeKey = (startIndex: number, endIndex: number) =>
  `${Math.min(startIndex, endIndex)}:${Math.max(startIndex, endIndex)}`

export const addUniqueEdge = (
  edges: Map<string, ModelEdge>,
  startIndex: number,
  endIndex: number
) => {
  if (startIndex === endIndex) {
    return
  }

  const edgeStart = Math.min(startIndex, endIndex)
  const edgeEnd = Math.max(startIndex, endIndex)
  const edgeKey = getUndirectedEdgeKey(startIndex, endIndex)

  if (!edges.has(edgeKey)) {
    edges.set(edgeKey, [edgeStart, edgeEnd])
  }
}

export const isDegenerateTriangle = (
  [a, b, c]: [ModelVertex, ModelVertex, ModelVertex]
) => {
  const abX = b[0] - a[0]
  const abY = b[1] - a[1]
  const abZ = b[2] - a[2]
  const acX = c[0] - a[0]
  const acY = c[1] - a[1]
  const acZ = c[2] - a[2]
  const crossX = abY * acZ - abZ * acY
  const crossY = abZ * acX - abX * acZ
  const crossZ = abX * acY - abY * acX

  return crossX * crossX + crossY * crossY + crossZ * crossZ <= Number.EPSILON
}
