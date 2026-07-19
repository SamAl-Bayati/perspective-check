import { type ModelImportPreparation } from '@/lib/model-import/model-import-types'

const getFileExtension = (fileName: string) => {
  const extensionStart = fileName.lastIndexOf('.')
  return extensionStart === -1 ? '' : fileName.slice(extensionStart + 1).toLowerCase()
}

export const inspectObjImportFile = async (file: File): Promise<ModelImportPreparation> => {
  if (getFileExtension(file.name) !== 'obj') {
    throw new Error('Choose an OBJ file to continue')
  }

  const source = await file.text()
  const materialLibraries = new Set<string>()
  source.split(/\r?\n/).forEach((line) => {
    const match = line.trim().match(/^mtllib\s+(.+)$/i)
    if (match?.[1]) {
      match[1].trim().split(/\s+/).forEach((uri) => {
        materialLibraries.add(uri.replace(/^['"]|['"]$/g, ''))
      })
    }
  })

  return {
    entryFile: file,
    requirements: Array.from(materialLibraries, (uri) => ({
      id: `material:${uri}`,
      uri,
      kind: 'material' as const,
      label: `Material library: ${uri}`,
      accept: '.mtl,text/plain',
      required: false
    })),
    prefilledRelatedFiles: [],
    selectionSummary: materialLibraries.size > 0
      ? `${file.name} references ${materialLibraries.size} material library file${materialLibraries.size === 1 ? '' : 's'}`
      : file.name,
    allowAdditionalFiles: true
  }
}
