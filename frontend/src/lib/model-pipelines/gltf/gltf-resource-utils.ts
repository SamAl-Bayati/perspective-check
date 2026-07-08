type GltfJson = {
  buffers?: Array<{ uri?: string }>
  images?: Array<{ uri?: string }>
}

export type GltfResourceRequirements = {
  externalBufferUris: string[]
  externalImageUris: string[]
}

const GLB_HEADER_BYTES = 12
const GLB_CHUNK_HEADER_BYTES = 8
const GLB_JSON_CHUNK_TYPE = 0x4e4f534a
const GLTF_LOCAL_ORIGIN = 'https://perspective-check.local/'

const isDataUri = (value: string) => value.startsWith('data:')
const isAbsoluteUri = (value: string) => /^[a-z]+:/i.test(value)

const getGltfJsonFromGlb = (buffer: ArrayBuffer) => {
  if (buffer.byteLength < GLB_HEADER_BYTES + GLB_CHUNK_HEADER_BYTES) {
    throw new Error('GLB file is too small to be valid')
  }

  const view = new DataView(buffer)
  const jsonChunkLength = view.getUint32(GLB_HEADER_BYTES, true)
  const jsonChunkType = view.getUint32(GLB_HEADER_BYTES + 4, true)

  if (jsonChunkType !== GLB_JSON_CHUNK_TYPE) {
    throw new Error('GLB file is missing a JSON chunk')
  }

  const jsonChunkStart = GLB_HEADER_BYTES + GLB_CHUNK_HEADER_BYTES
  const jsonChunkEnd = jsonChunkStart + jsonChunkLength
  const jsonSource = new TextDecoder().decode(buffer.slice(jsonChunkStart, jsonChunkEnd))

  return JSON.parse(jsonSource) as GltfJson
}

const getGltfJson = (buffer: ArrayBuffer, extension: 'gltf' | 'glb') =>
  extension === 'gltf'
    ? JSON.parse(new TextDecoder().decode(buffer)) as GltfJson
    : getGltfJsonFromGlb(buffer)

export const normalizeGltfResourceUri = (uri: string) =>
  decodeURIComponent(uri)
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/^\.\//, '')

export const resolveGltfResourceUri = (entryPath: string, resourceUri: string) => {
  if (isAbsoluteUri(resourceUri)) {
    return normalizeGltfResourceUri(resourceUri)
  }

  const baseUrl = new URL(normalizeGltfResourceUri(entryPath), GLTF_LOCAL_ORIGIN)
  return normalizeGltfResourceUri(new URL(resourceUri, baseUrl).pathname)
}

export const getGltfResourceRequirements = (
  buffer: ArrayBuffer,
  extension: 'gltf' | 'glb'
): GltfResourceRequirements => {
  const gltfJson = getGltfJson(buffer, extension)

  return {
    externalBufferUris: gltfJson.buffers
      ?.flatMap((bufferEntry) =>
        bufferEntry.uri !== undefined && !isDataUri(bufferEntry.uri)
          ? [bufferEntry.uri]
          : []
      ) ?? [],
    externalImageUris: gltfJson.images
      ?.flatMap((imageEntry) =>
        imageEntry.uri !== undefined && !isDataUri(imageEntry.uri)
          ? [imageEntry.uri]
          : []
      ) ?? []
  }
}
