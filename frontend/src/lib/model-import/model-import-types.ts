import { type ProjectionModelRelatedFile } from '@/lib/model-pipelines/projection-model-file-bundle'

export type ModelImportFormatId = 'stl' | 'obj' | 'gltf'
export type ModelImportResourceKind = 'buffer' | 'image' | 'material'

export type ModelImportRequirement = {
  id: string
  uri: string
  kind: ModelImportResourceKind
  label: string
  accept: string
  required: boolean
}

export type ModelImportPreparation = {
  entryFile: File
  requirements: ModelImportRequirement[]
  prefilledRelatedFiles: ProjectionModelRelatedFile[]
  selectionSummary: string
  allowAdditionalFiles?: boolean
}
