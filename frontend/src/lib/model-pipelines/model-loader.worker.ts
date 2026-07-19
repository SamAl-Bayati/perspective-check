/// <reference lib="webworker" />

import { parseObjModel } from '@/lib/model-pipelines/obj/parse-obj-model'
import { parseStlModel } from '@/lib/model-pipelines/stl/parse-stl-model'
import { getProjectionModelTransferables } from '@/lib/model-pipelines/projection-model'
import {
  type ModelLoaderWorkerRequest,
  type ModelLoaderWorkerResponse
} from '@/lib/model-pipelines/model-loader-worker-protocol'

const postWorkerMessage = (message: ModelLoaderWorkerResponse) => {
  self.postMessage(
    message,
    message.type === 'success' ? getProjectionModelTransferables(message.model) : []
  )
}

self.onmessage = (event: MessageEvent<ModelLoaderWorkerRequest>) => {
  const { buffer, extension, fileName, relatedFiles } = event.data

  try {
    if (extension === 'obj') {
      const source = new TextDecoder().decode(buffer)
      const textRelatedFiles = relatedFiles
        .filter((relatedFile) => relatedFile.fileName.toLowerCase().endsWith('.mtl'))
        .map((relatedFile) => ({
          uri: relatedFile.uri,
          source: new TextDecoder().decode(relatedFile.buffer)
        }))
      postWorkerMessage({
        type: 'success',
        model: parseObjModel(source, fileName, textRelatedFiles)
      })
      return
    }

    if (extension === 'stl') {
      postWorkerMessage({
        type: 'success',
        model: parseStlModel(buffer, fileName)
      })
      return
    }

    postWorkerMessage({
      type: 'error',
      message: 'The model worker only supports OBJ and STL files'
    })
  } catch (error) {
    postWorkerMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Unable to load this 3D file'
    })
  }
}

export {}
