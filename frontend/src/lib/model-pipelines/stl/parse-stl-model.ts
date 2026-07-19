import {
  type ModelEdge,
  type ModelTriangle,
  type ModelVertex,
  type ProjectionModel
} from '@/lib/model-pipelines/projection-model'
import {
  addUniqueEdge,
  createIndexArray,
  flattenEdges,
  flattenVertices,
  getUndirectedEdgeKey,
  getVertexKey,
  isDegenerateTriangle
} from '@/lib/model-pipelines/projection-model-utils'

type StlFacet = {
  normal: ModelVertex | null
  vertices: [ModelVertex, ModelVertex, ModelVertex]
}

const BINARY_STL_HEADER_BYTES = 80
const BINARY_STL_TRIANGLE_COUNT_BYTES = 4
const BINARY_STL_TRIANGLE_BYTES = 50
const BINARY_STL_VERTEX_OFFSET = 12
const BINARY_STL_FLOAT_BYTES = 4
const numberPattern = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?'
const vertexPattern = new RegExp(
  `^vertex\\s+(${numberPattern})\\s+(${numberPattern})\\s+(${numberPattern})\\s*$`,
  'i'
)
const normalPattern = new RegExp(
  `^facet\\s+normal\\s+(${numberPattern})\\s+(${numberPattern})\\s+(${numberPattern})\\s*$`,
  'i'
)

const parseVector = (match: RegExpExecArray, message: string): ModelVertex => {
  const vector = match.slice(1, 4).map(Number) as ModelVertex
  if (vector.some((value) => !Number.isFinite(value))) {
    throw new Error(message)
  }
  return vector
}

const orientFacet = (facet: StlFacet): StlFacet => {
  const [a, b, c] = facet.vertices
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
  const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
  const geometricNormal: ModelVertex = [
    ab[1] * ac[2] - ab[2] * ac[1],
    ab[2] * ac[0] - ab[0] * ac[2],
    ab[0] * ac[1] - ab[1] * ac[0]
  ]
  const suppliedNormal = facet.normal
  if (!suppliedNormal) {
    return facet
  }

  const suppliedLengthSquared = suppliedNormal.reduce((sum, value) => sum + value * value, 0)
  const dot = suppliedNormal.reduce(
    (sum, value, index) => sum + value * geometricNormal[index],
    0
  )

  return suppliedLengthSquared > Number.EPSILON && dot < 0
    ? { ...facet, vertices: [a, c, b] }
    : facet
}

const buildProjectionModel = (name: string, facets: StlFacet[]): ProjectionModel => {
  const vertices: ModelVertex[] = []
  const vertexLookup = new Map<string, number>()
  const triangles: ModelTriangle[] = []
  const edges = new Map<string, ModelEdge>()
  const faceCountByEdge = new Map<string, number>()
  let degenerateCount = 0

  const appendVertex = (vertex: ModelVertex) => {
    const key = getVertexKey(vertex)
    const existing = vertexLookup.get(key)
    if (existing !== undefined) {
      return existing
    }
    const index = vertices.length
    vertices.push(vertex)
    vertexLookup.set(key, index)
    return index
  }

  facets.map(orientFacet).forEach((facet) => {
    if (isDegenerateTriangle(facet.vertices)) {
      degenerateCount += 1
      return
    }

    const triangle = facet.vertices.map(appendVertex) as ModelTriangle
    triangles.push(triangle)
    const triangleEdges = [
      [triangle[0], triangle[1]],
      [triangle[1], triangle[2]],
      [triangle[2], triangle[0]]
    ]
    triangleEdges.forEach(([start, end]) => {
      const edgeKey = getUndirectedEdgeKey(start, end)
      faceCountByEdge.set(edgeKey, (faceCountByEdge.get(edgeKey) ?? 0) + 1)
    })
    addUniqueEdge(edges, triangle[0], triangle[1])
    addUniqueEdge(edges, triangle[1], triangle[2])
    addUniqueEdge(edges, triangle[2], triangle[0])
  })

  if (vertices.length === 0 || triangles.length === 0) {
    throw new Error('STL file does not contain any valid triangles to render')
  }

  const positions = flattenVertices(vertices)
  const triangleIndices = triangles.flat()
  const edgeValues = flattenEdges(Array.from(edges.values()))
  const nonManifoldEdgeCount = Array.from(faceCountByEdge.values())
    .filter((faceCount) => faceCount > 2).length
  const warnings: string[] = []
  if (degenerateCount > 0) {
    warnings.push(`Skipped ${degenerateCount} degenerate STL triangle${degenerateCount === 1 ? '' : 's'}`)
  }
  if (nonManifoldEdgeCount > 0) {
    warnings.push(`STL contains ${nonManifoldEdgeCount} non-manifold edge${nonManifoldEdgeCount === 1 ? '' : 's'}`)
  }

  return {
    name,
    format: 'stl',
    meshes: [{
      name,
      positions,
      indices: createIndexArray(triangleIndices, vertices.length)
    }],
    wireframe: {
      positions: new Float32Array(positions),
      indices: createIndexArray(edgeValues, vertices.length)
    },
    materials: [],
    warnings,
    sourceVertexCount: vertices.length,
    triangleCount: triangles.length
  }
}

const parseAsciiStlModel = (source: string, name: string): ProjectionModel => {
  const facets: StlFacet[] = []
  let normal: ModelVertex | null = null
  let vertices: ModelVertex[] = []

  source.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim()
    const normalMatch = normalPattern.exec(line)
    if (normalMatch) {
      normal = parseVector(normalMatch, 'ASCII STL includes an invalid facet normal')
      vertices = []
      return
    }

    const vertexMatch = vertexPattern.exec(line)
    if (vertexMatch) {
      vertices.push(parseVector(vertexMatch, 'ASCII STL includes an invalid vertex'))
      return
    }

    if (/^endfacet\s*$/i.test(line)) {
      if (vertices.length !== 3) {
        throw new Error('ASCII STL facet must contain exactly three vertices')
      }
      facets.push({
        normal,
        vertices: vertices as [ModelVertex, ModelVertex, ModelVertex]
      })
      normal = null
      vertices = []
    }
  })

  if (facets.length === 0) {
    throw new Error('ASCII STL file does not contain any complete facets')
  }

  return buildProjectionModel(name, facets)
}

const isBinaryStl = (buffer: ArrayBuffer) => {
  if (buffer.byteLength < BINARY_STL_HEADER_BYTES + BINARY_STL_TRIANGLE_COUNT_BYTES) {
    return false
  }

  const view = new DataView(buffer)
  const triangleCount = view.getUint32(BINARY_STL_HEADER_BYTES, true)
  return BINARY_STL_HEADER_BYTES + BINARY_STL_TRIANGLE_COUNT_BYTES +
    triangleCount * BINARY_STL_TRIANGLE_BYTES === buffer.byteLength
}

const readBinaryVector = (view: DataView, offset: number): ModelVertex => {
  const vector: ModelVertex = [
    view.getFloat32(offset, true),
    view.getFloat32(offset + BINARY_STL_FLOAT_BYTES, true),
    view.getFloat32(offset + BINARY_STL_FLOAT_BYTES * 2, true)
  ]
  if (vector.some((value) => !Number.isFinite(value))) {
    throw new Error('Binary STL includes an invalid vector')
  }
  return vector
}

const parseBinaryStlModel = (buffer: ArrayBuffer, name: string): ProjectionModel => {
  const view = new DataView(buffer)
  const triangleCount = view.getUint32(BINARY_STL_HEADER_BYTES, true)
  const facets = Array.from({ length: triangleCount }, (_, triangleIndex) => {
    const triangleOffset = BINARY_STL_HEADER_BYTES + BINARY_STL_TRIANGLE_COUNT_BYTES +
      triangleIndex * BINARY_STL_TRIANGLE_BYTES
    const vertices = Array.from({ length: 3 }, (_, vertexIndex) =>
      readBinaryVector(
        view,
        triangleOffset + BINARY_STL_VERTEX_OFFSET + vertexIndex * 3 * BINARY_STL_FLOAT_BYTES
      )
    ) as [ModelVertex, ModelVertex, ModelVertex]

    return {
      normal: readBinaryVector(view, triangleOffset),
      vertices
    }
  })

  return buildProjectionModel(name, facets)
}

export const parseStlModel = (buffer: ArrayBuffer, name: string): ProjectionModel => {
  if (isBinaryStl(buffer)) {
    return parseBinaryStlModel(buffer, name)
  }

  return parseAsciiStlModel(new TextDecoder().decode(buffer), name)
}
