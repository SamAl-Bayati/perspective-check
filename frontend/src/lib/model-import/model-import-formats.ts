import { type ModelImportFormatId, type ModelImportPreparation } from '@/lib/model-import/model-import-types'
import { GLTF_ENTRY_FILE_ACCEPT, inspectGltfImportFile } from '@/lib/model-pipelines/gltf/gltf-import-utils'
import { inspectObjImportFile } from '@/lib/model-pipelines/obj/obj-import-utils'

type ModelImportFormatDefinition = {
  id: ModelImportFormatId
  title: string
  description: string
  entryLabel: string
  entryHint: string
  entryAccept: string
  prepareSelection: (file: File) => Promise<ModelImportPreparation>
}

const getFileExtension = (fileName: string) => {
  const extensionStart = fileName.lastIndexOf('.')
  return extensionStart === -1 ? '' : fileName.slice(extensionStart + 1).toLowerCase()
}

const createSingleFilePreparation = async (
  file: File,
  expectedExtension: 'obj' | 'stl'
): Promise<ModelImportPreparation> => {
  if (getFileExtension(file.name) !== expectedExtension) {
    throw new Error(`Choose a ${expectedExtension.toUpperCase()} file to continue`)
  }

  return {
    entryFile: file,
    requirements: [],
    prefilledRelatedFiles: [],
    selectionSummary: file.name
  }
}

export const MODEL_IMPORT_FORMATS: ModelImportFormatDefinition[] = [
  {
    id: 'stl',
    title: 'STL',
    description: 'Import a single STL mesh file.',
    entryLabel: 'STL file',
    entryHint: 'Choose one .stl file.',
    entryAccept: '.stl',
    prepareSelection: (file) => createSingleFilePreparation(file, 'stl')
  },
  {
    id: 'obj',
    title: 'OBJ',
    description: 'Import OBJ geometry with optional MTL materials and textures.',
    entryLabel: 'OBJ file',
    entryHint: 'Choose an .obj file, then add its optional material sidecars.',
    entryAccept: '.obj',
    prepareSelection: inspectObjImportFile
  },
  {
    id: 'gltf',
    title: 'GLB / GLTF',
    description: 'Import .glb, .gltf, or a .zip archive that contains the full model package.',
    entryLabel: 'GLB, GLTF, or ZIP file',
    entryHint: 'Choose one .glb, .gltf, or .zip file. GLTF sidecars can be added below.',
    entryAccept: GLTF_ENTRY_FILE_ACCEPT,
    prepareSelection: inspectGltfImportFile
  }
]

export const MODEL_IMPORT_FORMATS_BY_ID = Object.fromEntries(
  MODEL_IMPORT_FORMATS.map((format) => [format.id, format])
) as Record<ModelImportFormatId, ModelImportFormatDefinition>
