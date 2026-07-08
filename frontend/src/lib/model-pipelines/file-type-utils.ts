const getFileExtension = (fileName: string) => {
  const extensionStart = fileName.lastIndexOf('.')
  return extensionStart === -1 ? '' : fileName.slice(extensionStart + 1).toLowerCase()
}

export const getMimeTypeFromFileName = (fileName: string) => {
  const extension = getFileExtension(fileName)

  if (extension === 'gltf') {
    return 'model/gltf+json'
  }

  if (extension === 'glb') {
    return 'model/gltf-binary'
  }

  if (extension === 'bin') {
    return 'application/octet-stream'
  }

  if (extension === 'png') {
    return 'image/png'
  }

  if (extension === 'jpg' || extension === 'jpeg') {
    return 'image/jpeg'
  }

  if (extension === 'webp') {
    return 'image/webp'
  }

  if (extension === 'avif') {
    return 'image/avif'
  }

  if (extension === 'gif') {
    return 'image/gif'
  }

  if (extension === 'bmp') {
    return 'image/bmp'
  }

  if (extension === 'svg') {
    return 'image/svg+xml'
  }

  return ''
}

