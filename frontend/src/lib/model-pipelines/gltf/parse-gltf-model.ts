import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

import {
  type ModelEdge,
  type ModelVertex,
  type ProjectionModel
} from '@/lib/model-pipelines/projection-model'
import { getMimeTypeFromFileName } from '@/lib/model-pipelines/file-type-utils'
import { normalizeProjectionVertices } from '@/lib/model-pipelines/projection-model-utils'
import {
  getGltfResourceRequirements,
  normalizeGltfResourceUri
} from '@/lib/model-pipelines/gltf/gltf-resource-utils'

type GltfRelatedResource = {
  uri: string
  fileName: string
  fileType: string
  buffer: ArrayBuffer
}

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

const getVertexKey = ([x, y, z]: ModelVertex) =>
  [x, y, z].map((coordinate) => Object.is(coordinate, -0) ? '0' : coordinate.toPrecision(12)).join(':')

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

const addEdgesFromPositionAttribute = (
  positions: Float32Array | Uint16Array | Uint32Array,
  vertices: ModelVertex[],
  vertexLookup: Map<string, number>,
  edges: Map<string, ModelEdge>
) => {
  for (let positionIndex = 0; positionIndex < positions.length; positionIndex += 6) {
    const startVertex = [
      positions[positionIndex],
      positions[positionIndex + 1],
      positions[positionIndex + 2]
    ] satisfies ModelVertex
    const endVertex = [
      positions[positionIndex + 3],
      positions[positionIndex + 4],
      positions[positionIndex + 5]
    ] satisfies ModelVertex

    const startIndex = appendVertex(startVertex, vertices, vertexLookup)
    const endIndex = appendVertex(endVertex, vertices, vertexLookup)
    addEdge(edges, startIndex, endIndex)
  }
}

const loadGltfDocument = async (
  buffer: ArrayBuffer,
  extension: 'gltf' | 'glb',
  relatedFiles: GltfRelatedResource[]
) => {
  const { externalBufferUris, externalImageUris } = getGltfResourceRequirements(buffer, extension)
  const resourceByUri = new Map<string, GltfRelatedResource>()

  relatedFiles.forEach((relatedFile) => {
    resourceByUri.set(relatedFile.uri, relatedFile)
    resourceByUri.set(normalizeGltfResourceUri(relatedFile.uri), relatedFile)
  })

  const requiredUris = [...externalBufferUris, ...externalImageUris]
  const missingUris = requiredUris.filter((uri) => !resourceByUri.has(uri))
  if (missingUris.length > 0) {
    throw new Error(`Missing required GLTF resource file: ${missingUris[0]}`)
  }

  const loadingManager = new THREE.LoadingManager()
  const objectUrls: string[] = []

  loadingManager.setURLModifier((url) => {
    const relatedFile = resourceByUri.get(url) ?? resourceByUri.get(normalizeGltfResourceUri(url))
    if (!relatedFile) {
      return url
    }

    const objectUrl = URL.createObjectURL(
      new Blob([relatedFile.buffer], {
        type: relatedFile.fileType || getMimeTypeFromFileName(relatedFile.fileName) || undefined
      })
    )
    objectUrls.push(objectUrl)
    return objectUrl
  })

  try {
    const loader = new GLTFLoader(loadingManager)
    return await loader.parseAsync(extension === 'gltf' ? new TextDecoder().decode(buffer) : buffer, '')
  } finally {
    objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl))
  }
}

export const parseGltfModel = async (
  buffer: ArrayBuffer,
  name: string,
  extension: 'gltf' | 'glb',
  relatedFiles: GltfRelatedResource[]
): Promise<ProjectionModel> => {
  const gltf = await loadGltfDocument(buffer, extension, relatedFiles)
  const vertices: ModelVertex[] = []
  const vertexLookup = new Map<string, number>()
  const edges = new Map<string, ModelEdge>()

  gltf.scene.updateMatrixWorld(true)

  gltf.scene.traverse((object) => {
    if (!('isMesh' in object) || object.isMesh !== true) {
      return
    }

    const geometry = (object as THREE.Mesh).geometry
    if (!(geometry instanceof THREE.BufferGeometry)) {
      return
    }

    const worldGeometry = geometry.clone()
    worldGeometry.applyMatrix4(object.matrixWorld)

    const edgeGeometry = new THREE.EdgesGeometry(worldGeometry)
    const positionAttribute = edgeGeometry.getAttribute('position')

    if (!positionAttribute || positionAttribute.itemSize !== 3) {
      edgeGeometry.dispose()
      worldGeometry.dispose()
      return
    }

    addEdgesFromPositionAttribute(
      positionAttribute.array as Float32Array | Uint16Array | Uint32Array,
      vertices,
      vertexLookup,
      edges
    )

    edgeGeometry.dispose()
    worldGeometry.dispose()
  })

  if (vertices.length === 0 || edges.size === 0) {
    throw new Error('GLTF file does not contain any mesh edges to render')
  }

  return {
    name,
    vertices: normalizeProjectionVertices(vertices),
    edges: Array.from(edges.values())
  }
}
