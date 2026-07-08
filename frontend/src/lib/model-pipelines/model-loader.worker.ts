/// <reference lib="webworker" />

import { parseGltfModel } from '@/lib/model-pipelines/gltf/parse-gltf-model'
import { parseObjModel } from '@/lib/model-pipelines/obj/parse-obj-model'
import { parseStlModel } from '@/lib/model-pipelines/stl/parse-stl-model'
import {
  type ModelLoaderWorkerRequest,
  type ModelLoaderWorkerResponse
} from '@/lib/model-pipelines/model-loader-worker-protocol'

const postWorkerMessage = (message: ModelLoaderWorkerResponse) => {
  self.postMessage(message)
}

self.onmessage = (event: MessageEvent<ModelLoaderWorkerRequest>) => {
  const { buffer, extension, fileName, relatedFiles } = event.data

  try {
    if (extension === 'obj') {
      const source = new TextDecoder().decode(buffer)
      postWorkerMessage({
        type: 'success',
        model: parseObjModel(source, fileName)
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

    if (extension === 'gltf' || extension === 'glb') {
      void parseGltfModel(buffer, fileName, extension, relatedFiles).then(
        (model) => {
          postWorkerMessage({
            type: 'success',
            model
          })
        },
        (error: unknown) => {
          postWorkerMessage({
            type: 'error',
            message: error instanceof Error ? error.message : 'Unable to load this 3D file'
          })
        }
      )
      return
    }

    postWorkerMessage({
      type: 'error',
      message: 'Only OBJ, STL, GLTF, and GLB files are supported right now'
    })
  } catch (error) {
    postWorkerMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Unable to load this 3D file'
    })
  }
}

export {}
