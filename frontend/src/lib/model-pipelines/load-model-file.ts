import { parseObjModel } from '@/lib/model-pipelines/obj/parse-obj-model'
import { type ProjectionModel } from '@/lib/model-pipelines/projection-model'

const getFileExtension = (fileName: string) => {
  const extensionStart = fileName.lastIndexOf('.')
  return extensionStart === -1 ? '' : fileName.slice(extensionStart + 1).toLowerCase()
}

export const loadProjectionModelFromFile = async (file: File): Promise<ProjectionModel> => {
  const extension = getFileExtension(file.name)

  if (extension === 'obj') {
    return parseObjModel(await file.text(), file.name)
  }

  throw new Error('Only OBJ files are supported right now')
}
