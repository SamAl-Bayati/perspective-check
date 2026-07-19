export type ModelVertex = [number, number, number]
export type ModelEdge = [number, number]
export type ModelTriangle = [number, number, number]
export type ProjectionModelFormat = 'default' | 'stl' | 'obj'

export type ProjectionMaterialDefinition = {
  name: string
  color: string
  opacity: number
  roughness: number
  emissive: string
  mapUri?: string
}

export type ProjectionMeshPrimitive = {
  name: string
  positions: Float32Array
  indices: Uint16Array | Uint32Array
  normals?: Float32Array
  uvs?: Float32Array
  materialName?: string
}

export type ProjectionWireframe = {
  positions: Float32Array
  indices: Uint16Array | Uint32Array
}

export type ProjectionModel = {
  name: string
  format: ProjectionModelFormat
  meshes: ProjectionMeshPrimitive[]
  wireframe: ProjectionWireframe
  materials: ProjectionMaterialDefinition[]
  warnings: string[]
  sourceVertexCount: number
  triangleCount: number
}

export const getProjectionModelTransferables = (model: ProjectionModel): Transferable[] => {
  const transferables: Transferable[] = [
    model.wireframe.positions.buffer,
    model.wireframe.indices.buffer
  ]

  model.meshes.forEach((mesh) => {
    transferables.push(mesh.positions.buffer, mesh.indices.buffer)
    if (mesh.normals) {
      transferables.push(mesh.normals.buffer)
    }
    if (mesh.uvs) {
      transferables.push(mesh.uvs.buffer)
    }
  })

  return transferables
}
