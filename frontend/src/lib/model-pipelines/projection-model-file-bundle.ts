export type ProjectionModelRelatedFile = {
  uri: string
  file: File
}

export type ProjectionModelFileBundle = {
  entryFile: File
  relatedFiles: ProjectionModelRelatedFile[]
}
