import ModelLoaderWorker from '@/lib/model-pipelines/model-loader.worker?worker'
import {
  type ModelLoaderWorkerResponse
} from '@/lib/model-pipelines/model-loader-worker-protocol'
import { type ProjectionModel } from '@/lib/model-pipelines/projection-model'

const getFileExtension = (fileName: string) => {
  const extensionStart = fileName.lastIndexOf('.')
  return extensionStart === -1 ? '' : fileName.slice(extensionStart + 1).toLowerCase()
}

const createAbortError = () => new DOMException('The model load was aborted', 'AbortError')

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

const parseProjectionModelInWorker = (
  fileName: string,
  extension: string,
  buffer: ArrayBuffer,
  signal?: AbortSignal
) =>
  new Promise<ProjectionModel>((resolve, reject) => {
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
        fileName,
        buffer
      },
      [buffer]
    )
  })

export const loadProjectionModelFromFile = async (
  file: File,
  signal?: AbortSignal
): Promise<ProjectionModel> => {
  const extension = getFileExtension(file.name)

  if (extension !== 'obj' && extension !== 'stl') {
    throw new Error('Only OBJ and STL files are supported right now')
  }

  const buffer = await readFileAsArrayBuffer(file, signal)
  return parseProjectionModelInWorker(file.name, extension, buffer, signal)
}
