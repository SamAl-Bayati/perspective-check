export type ModelVertex = [number, number, number]
export type ModelEdge = [number, number]

export type ProjectionModel = {
  name: string
  vertices: ModelVertex[]
  edges: ModelEdge[]
}
