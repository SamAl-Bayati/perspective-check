import { type ProjectionModel } from '@/lib/model-pipelines/projection-model'

export type ModelLoaderWorkerRequest = {
  extension: string
  fileName: string
  buffer: ArrayBuffer
  relatedFiles: Array<{
    uri: string
    fileName: string
    fileType: string
    buffer: ArrayBuffer
  }>
}

export type ModelLoaderWorkerResponse =
  | {
      type: 'success'
      model: ProjectionModel
    }
  | {
      type: 'error'
      message: string
    }
