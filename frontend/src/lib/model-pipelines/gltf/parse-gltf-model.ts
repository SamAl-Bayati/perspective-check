import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

import { getMimeTypeFromFileName } from '@/lib/model-pipelines/file-type-utils'
import { type ProjectionModelFileBundle } from '@/lib/model-pipelines/projection-model-file-bundle'
import {
  getGltfResourceRequirements,
  normalizeGltfResourceUri
} from '@/lib/model-pipelines/gltf/gltf-resource-utils'
import {
  createGltfProjectionModelAsset,
  type ProjectionModelAsset
} from '@/lib/model-viewer/projection-model-asset'

const WHITE_PIXEL_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lY4J8QAAAABJRU5ErkJggg=='

const createAbortError = () => new DOMException('The model load was aborted', 'AbortError')

const parseGltfDocument = async (
  buffer: ArrayBuffer,
  extension: 'gltf' | 'glb',
  fileBundle: ProjectionModelFileBundle,
  missingImageUris: Set<string>,
  ignoreExternalImages: boolean
) => {
  const resourceByUri = new Map(
    fileBundle.relatedFiles.flatMap((relatedFile) => {
      const normalized = normalizeGltfResourceUri(relatedFile.uri)
      return [
        [relatedFile.uri, relatedFile.file] as const,
        [normalized, relatedFile.file] as const
      ]
    })
  )
  const loadingManager = new THREE.LoadingManager()
  const objectUrls: string[] = []

  loadingManager.setURLModifier((url) => {
    const normalized = normalizeGltfResourceUri(url)
    if (missingImageUris.has(url) || missingImageUris.has(normalized)) {
      return WHITE_PIXEL_DATA_URI
    }

    const file = resourceByUri.get(url) ?? resourceByUri.get(normalized)
    if (!file) {
      return url
    }
    const fileType = file.type || getMimeTypeFromFileName(file.name)
    if (ignoreExternalImages && fileType.startsWith('image/')) {
      return WHITE_PIXEL_DATA_URI
    }

    const objectUrl = URL.createObjectURL(new Blob([file], {
      type: file.type || getMimeTypeFromFileName(file.name) || undefined
    }))
    objectUrls.push(objectUrl)
    return objectUrl
  })

  try {
    const loader = new GLTFLoader(loadingManager)
    return await loader.parseAsync(
      extension === 'gltf' ? new TextDecoder().decode(buffer) : buffer,
      ''
    )
  } finally {
    objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl))
  }
}

export const loadGltfProjectionModelAsset = async (
  fileBundle: ProjectionModelFileBundle,
  extension: 'gltf' | 'glb',
  signal?: AbortSignal
): Promise<ProjectionModelAsset> => {
  if (signal?.aborted) {
    throw createAbortError()
  }

  const buffer = await fileBundle.entryFile.arrayBuffer()
  const { externalBufferUris, externalImageUris } = getGltfResourceRequirements(buffer, extension)
  const relatedUris = new Set(fileBundle.relatedFiles.flatMap((relatedFile) => [
    relatedFile.uri,
    normalizeGltfResourceUri(relatedFile.uri)
  ]))
  const missingBuffer = externalBufferUris.find((uri) =>
    !relatedUris.has(uri) && !relatedUris.has(normalizeGltfResourceUri(uri))
  )
  if (missingBuffer) {
    throw new Error(`Missing required GLTF resource file: ${missingBuffer}`)
  }

  const missingImages = externalImageUris.filter((uri) =>
    !relatedUris.has(uri) && !relatedUris.has(normalizeGltfResourceUri(uri))
  )
  const missingImageUris = new Set(missingImages.flatMap((uri) => [
    uri,
    normalizeGltfResourceUri(uri)
  ]))
  const warnings = missingImages.map((uri) => `Missing GLTF texture: ${uri}`)

  let gltf
  try {
    gltf = await parseGltfDocument(buffer, extension, fileBundle, missingImageUris, false)
  } catch (error) {
    if (externalImageUris.length === 0) {
      throw error
    }
    warnings.push('One or more GLTF textures could not be decoded. External textures were replaced with neutral fallbacks.')
    gltf = await parseGltfDocument(buffer, extension, fileBundle, missingImageUris, true)
  }

  const asset = createGltfProjectionModelAsset(
    gltf.scene,
    fileBundle.entryFile.name,
    extension,
    warnings,
    Array.isArray(gltf.parser.json.materials) && gltf.parser.json.materials.length > 0
  )
  if (signal?.aborted) {
    asset.dispose()
    throw createAbortError()
  }
  return asset
}
