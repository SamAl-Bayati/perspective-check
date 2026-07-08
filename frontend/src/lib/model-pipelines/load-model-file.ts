import ModelLoaderWorker from '@/lib/model-pipelines/model-loader.worker?worker'
import {
  type ModelLoaderWorkerResponse
} from '@/lib/model-pipelines/model-loader-worker-protocol'
import { type ProjectionModelFileBundle } from '@/lib/model-pipelines/projection-model-file-bundle'
import { type ProjectionModel } from '@/lib/model-pipelines/projection-model'

const getFileExtension = (fileName: string) => {
  const extensionStart = fileName.lastIndexOf('.')
  return extensionStart === -1 ? '' : fileName.slice(extensionStart + 1).toLowerCase()
}

const createAbortError = () => new DOMException('The model load was aborted', 'AbortError')
const createFileBundle = (fileOrBundle: File | ProjectionModelFileBundle): ProjectionModelFileBundle =>
  fileOrBundle instanceof File
    ? {
        entryFile: fileOrBundle,
        relatedFiles: []
      }
    : fileOrBundle

const readFileAsArrayBuffer = (file: File, signal?: AbortSignal) =>
  new Promise<ArrayBuffer>((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError())
      return
    }

    const reader = new FileReader()

    const cleanup = () => {
      signal?.removeEventListener('abort', handleAbort)
    }

    const handleAbort = () => {
      reader.abort()
    }

    reader.onload = () => {
      cleanup()
      resolve(reader.result as ArrayBuffer)
    }

    reader.onerror = () => {
      cleanup()
      reject(reader.error ?? new Error('Unable to read this 3D file'))
    }

    reader.onabort = () => {
      cleanup()
      reject(createAbortError())
    }

    signal?.addEventListener('abort', handleAbort, { once: true })
    reader.readAsArrayBuffer(file)
  })

export const loadProjectionModelFromFile = async (
  fileOrBundle: File | ProjectionModelFileBundle,
  signal?: AbortSignal
): Promise<ProjectionModel> => {
  const fileBundle = createFileBundle(fileOrBundle)
  const extension = getFileExtension(fileBundle.entryFile.name)

  if (extension !== 'obj' && extension !== 'stl' && extension !== 'gltf' && extension !== 'glb') {
    throw new Error('Only OBJ, STL, GLTF, and GLB files are supported right now')
  }

  const buffer = await readFileAsArrayBuffer(fileBundle.entryFile, signal)
  const relatedFiles = await Promise.all(
    fileBundle.relatedFiles.map(async (relatedFile) => ({
      uri: relatedFile.uri,
      fileName: relatedFile.file.name,
      fileType: relatedFile.file.type,
      buffer: await readFileAsArrayBuffer(relatedFile.file, signal)
    }))
  )

  return new Promise<ProjectionModel>((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError())
      return
    }

    const worker = new ModelLoaderWorker()

    const cleanup = () => {
      signal?.removeEventListener('abort', handleAbort)
      worker.terminate()
    }

    const handleAbort = () => {
      cleanup()
      reject(createAbortError())
    }

    worker.onmessage = (event: MessageEvent<ModelLoaderWorkerResponse>) => {
      cleanup()
      if (event.data.type === 'success') {
        resolve(event.data.model)
        return
      }

      reject(new Error(event.data.message))
    }

    worker.onerror = () => {
      cleanup()
      reject(new Error('Unable to load this 3D file'))
    }

    signal?.addEventListener('abort', handleAbort, { once: true })
    worker.postMessage(
      {
        extension,
        fileName: fileBundle.entryFile.name,
        buffer,
        relatedFiles
      },
      [buffer, ...relatedFiles.map((relatedFile) => relatedFile.buffer)]
    )
  })
}
