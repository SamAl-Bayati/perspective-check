import JSZip from 'jszip'

import { type ModelImportPreparation, type ModelImportRequirement } from '@/lib/model-import/model-import-types'
import { getMimeTypeFromFileName } from '@/lib/model-pipelines/file-type-utils'
import {
  getGltfResourceRequirements,
  normalizeGltfResourceUri,
  resolveGltfResourceUri
} from '@/lib/model-pipelines/gltf/gltf-resource-utils'

const GLTF_ENTRY_FILE_ACCEPT = '.gltf,.glb,.zip'

const getFileExtension = (fileName: string) => {
  const extensionStart = fileName.lastIndexOf('.')
  return extensionStart === -1 ? '' : fileName.slice(extensionStart + 1).toLowerCase()
}

const getRequirementLabel = (
  uri: string,
  kind: ModelImportRequirement['kind']
) => kind === 'buffer' ? `Binary buffer: ${uri}` : `Image texture: ${uri}`

const createRequirement = (
  uri: string,
  kind: ModelImportRequirement['kind']
): ModelImportRequirement => ({
  id: `${kind}:${uri}`,
  uri,
  kind,
  label: getRequirementLabel(uri, kind),
  accept: kind === 'buffer' ? '.bin,application/octet-stream' : 'image/*',
  required: kind === 'buffer'
})

const createRequirementsFromBuffer = (buffer: ArrayBuffer, extension: 'gltf' | 'glb') => {
  const { externalBufferUris, externalImageUris } = getGltfResourceRequirements(buffer, extension)

  return [
    ...externalBufferUris.map((uri) => createRequirement(uri, 'buffer')),
    ...externalImageUris.map((uri) => createRequirement(uri, 'image'))
  ]
}

const createFileFromZipEntry = async (zipEntry: JSZip.JSZipObject) => {
  const fileName = zipEntry.name.split('/').at(-1) ?? zipEntry.name
  const buffer = await zipEntry.async('arraybuffer')

  return new File([buffer], fileName, {
    type: getMimeTypeFromFileName(fileName)
  })
}

const getArchiveFileEntries = (archive: JSZip) =>
  Object.values(archive.files).filter((entry) => !entry.dir)

export const inspectGltfImportFile = async (
  file: File
): Promise<ModelImportPreparation> => {
  const extension = getFileExtension(file.name)

  if (extension === 'zip') {
    return extractGltfBundleFromArchive(file)
  }

  if (extension !== 'gltf' && extension !== 'glb') {
    throw new Error('Choose a GLTF, GLB, or ZIP file for this import type')
  }

  const requirements = createRequirementsFromBuffer(await file.arrayBuffer(), extension)

  return {
    entryFile: file,
    requirements,
    prefilledRelatedFiles: [],
    selectionSummary: file.name
  }
}

export const extractGltfBundleFromArchive = async (
  archiveFile: File
): Promise<ModelImportPreparation> => {
  const archive = await JSZip.loadAsync(await archiveFile.arrayBuffer())
  const archiveEntries = getArchiveFileEntries(archive)
  const modelEntries = archiveEntries.filter((entry) => {
    const extension = getFileExtension(entry.name)
    return extension === 'gltf' || extension === 'glb'
  })

  if (modelEntries.length === 0) {
    throw new Error('ZIP archive does not contain a GLTF or GLB file')
  }

  if (modelEntries.length > 1) {
    throw new Error('ZIP archive contains multiple GLTF or GLB files. Keep one model per archive.')
  }

  const modelEntry = modelEntries[0]
  const entryFile = await createFileFromZipEntry(modelEntry)
  const entryExtension = getFileExtension(modelEntry.name)

  if (entryExtension !== 'gltf' && entryExtension !== 'glb') {
    throw new Error('ZIP archive does not contain a supported GLTF or GLB model')
  }

  const requirements = createRequirementsFromBuffer(await entryFile.arrayBuffer(), entryExtension)
  const archiveEntryByPath = new Map(
    archiveEntries.map((entry) => [normalizeGltfResourceUri(entry.name), entry])
  )
  const prefilledRelatedFiles = []

  for (const requirement of requirements) {
    const resolvedPath = resolveGltfResourceUri(modelEntry.name, requirement.uri)
    const matchedEntry = archiveEntryByPath.get(resolvedPath)

    if (!matchedEntry && requirement.required) {
      throw new Error(
        `ZIP archive is missing required binary file: ${requirement.uri}`
      )
    }

    if (!matchedEntry) {
      continue
    }

    prefilledRelatedFiles.push({
      uri: requirement.uri,
      file: await createFileFromZipEntry(matchedEntry)
    })
  }

  return {
    entryFile,
    requirements,
    prefilledRelatedFiles,
    selectionSummary: `${archiveFile.name} -> ${entryFile.name}`
  }
}

export { GLTF_ENTRY_FILE_ACCEPT }
