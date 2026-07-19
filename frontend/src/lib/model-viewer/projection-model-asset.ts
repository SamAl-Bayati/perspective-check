import * as THREE from 'three'

import {
  type DefaultMaterialSettings,
  type ModelViewerSettings,
  getPaletteColor
} from '@/constants/model-materials'
import {
  type ProjectionMaterialDefinition,
  type ProjectionModel
} from '@/lib/model-pipelines/projection-model'
import { type ProjectionModelFileBundle } from '@/lib/model-pipelines/projection-model-file-bundle'

type MaterialBinding = {
  mesh: THREE.Mesh
  material: THREE.Material | THREE.Material[]
}

export type ProjectionModelAssetStats = {
  loadTimeMs: number
  vertices: number
  triangles: number
  edges: number
  materials: number
  textures: number
  wireframeGenerationMs: number
}

export type ProjectionModelAsset = {
  name: string
  format: 'default' | 'stl' | 'obj' | 'gltf' | 'glb'
  root: THREE.Group
  hasSurfaces: boolean
  hasImportedMaterials: boolean
  warnings: string[]
  stats: ProjectionModelAssetStats
  applyViewerSettings: (settings: ModelViewerSettings, wireColor: string) => void
  dispose: () => void
}

export const getInitialViewerSettingsForAsset = (
  asset: ProjectionModelAsset,
  currentSettings: ModelViewerSettings
): ModelViewerSettings => ({
  ...currentSettings,
  materialMode: asset.hasImportedMaterials ? 'original' : 'default',
  defaultMaterial: {
    ...currentSettings.defaultMaterial,
    shading: asset.format === 'stl' ? 'flat' : 'smooth'
  }
})

type CreateAssetOptions = {
  name: string
  format: ProjectionModelAsset['format']
  content: THREE.Object3D
  surfaceMeshes: THREE.Mesh[]
  wireObjects: Array<THREE.Line | THREE.LineSegments | THREE.LineLoop>
  generatedWireGeometries: THREE.BufferGeometry[]
  generatedWireObjects: THREE.LineSegments[]
  hasImportedMaterials: boolean
  warnings: string[]
  sourceVertexCount: number
  triangleCount: number
  wireframeGenerationMs: number
}

const materialTextureKeys = [
  'map',
  'alphaMap',
  'aoMap',
  'bumpMap',
  'displacementMap',
  'emissiveMap',
  'envMap',
  'lightMap',
  'metalnessMap',
  'normalMap',
  'roughnessMap',
  'specularMap'
] as const

const collectMaterialTextures = (material: THREE.Material, textures: Set<THREE.Texture>) => {
  const materialRecord = material as unknown as Record<string, unknown>
  materialTextureKeys.forEach((key) => {
    const value = materialRecord[key]
    if (value instanceof THREE.Texture) {
      textures.add(value)
    }
  })
}

const applyDefaultMaterialValues = (
  material: THREE.MeshStandardMaterial,
  settings: DefaultMaterialSettings
) => {
  const nextTransparent = settings.opacity < 1
  const nextSide = settings.doubleSided ? THREE.DoubleSide : THREE.FrontSide
  const nextFlatShading = settings.shading === 'flat'
  const requiresUpdate =
    material.transparent !== nextTransparent ||
    material.side !== nextSide ||
    material.flatShading !== nextFlatShading

  material.color.set(settings.baseColor)
  material.opacity = settings.opacity
  material.transparent = nextTransparent
  material.depthWrite = !nextTransparent
  material.metalness = settings.metalness
  material.roughness = settings.roughness
  material.emissive.set(settings.emissiveColor)
  material.emissiveIntensity = settings.emissiveIntensity
  material.side = nextSide
  material.flatShading = nextFlatShading
  material.polygonOffset = true
  material.polygonOffsetFactor = 1
  material.polygonOffsetUnits = 1
  if (requiresUpdate) {
    material.needsUpdate = true
  }
}

const normalizeContent = (root: THREE.Group, content: THREE.Object3D) => {
  content.updateMatrixWorld(true)
  const bounds = new THREE.Box3().setFromObject(content)
  if (bounds.isEmpty()) {
    root.add(content)
    return
  }

  const center = bounds.getCenter(new THREE.Vector3())
  const size = bounds.getSize(new THREE.Vector3())
  const maxDimension = Math.max(size.x, size.y, size.z)
  const scale = maxDimension > Number.EPSILON ? 2 / maxDimension : 1
  content.scale.multiplyScalar(scale)
  content.position.addScaledVector(center, -scale)
  root.add(content)
}

const createAsset = ({
  name,
  format,
  content,
  surfaceMeshes,
  wireObjects,
  generatedWireGeometries,
  generatedWireObjects,
  hasImportedMaterials,
  warnings,
  sourceVertexCount,
  triangleCount,
  wireframeGenerationMs
}: CreateAssetOptions): ProjectionModelAsset => {
  const root = new THREE.Group()
  normalizeContent(root, content)

  const originalBindings: MaterialBinding[] = surfaceMeshes.map((mesh) => ({
    mesh,
    material: mesh.material
  }))
  const defaultMaterial = new THREE.MeshStandardMaterial()
  const paletteMaterials = new Map<THREE.Material, THREE.Material>()
  const solidWireMaterial = new THREE.LineBasicMaterial({
    color: '#000000',
    transparent: true,
    opacity: 0.95,
    depthTest: true,
    depthWrite: false
  })
  const dashedWireMaterial = new THREE.LineDashedMaterial({
    color: '#000000',
    dashSize: 0.05,
    gapSize: 0.035,
    transparent: true,
    opacity: 0.95,
    depthTest: true,
    depthWrite: false
  })
  generatedWireObjects.forEach((wire) => {
    const initialMaterials = Array.isArray(wire.material) ? wire.material : [wire.material]
    initialMaterials.forEach((material) => material.dispose())
    wire.material = solidWireMaterial
  })
  let disposed = false
  let activeWireStyle: ModelViewerSettings['wireframeStyle'] | null = 'solid'

  const getPaletteMaterial = (material: THREE.Material, paletteColor: string) => {
    let override = paletteMaterials.get(material)
    if (!override) {
      override = material.clone()
      paletteMaterials.set(material, override)
    }
    const colorMaterial = override as THREE.Material & { color?: THREE.Color }
    colorMaterial.color?.set(paletteColor)
    return override
  }

  const assignOriginalMaterials = () => {
    originalBindings.forEach(({ mesh, material }) => {
      mesh.material = material
    })
  }

  const assignPaletteMaterials = (paletteColor: string) => {
    originalBindings.forEach(({ mesh, material }) => {
      mesh.material = Array.isArray(material)
        ? material.map((entry) => getPaletteMaterial(entry, paletteColor))
        : getPaletteMaterial(material, paletteColor)
    })
  }

  const applyViewerSettings = (settings: ModelViewerSettings, wireColor: string) => {
    if (disposed) {
      return
    }

    surfaceMeshes.forEach((mesh) => {
      mesh.visible = settings.solidVisible
    })
    wireObjects.forEach((wire) => {
      wire.visible = settings.wireframeVisible
    })
    generatedWireObjects.forEach((wire) => {
      wire.visible = settings.wireframeVisible
    })

    applyDefaultMaterialValues(defaultMaterial, settings.defaultMaterial)

    if (settings.materialMode === 'default') {
      surfaceMeshes.forEach((mesh) => {
        mesh.material = defaultMaterial
      })
    } else if (settings.materialMode === 'palette') {
      assignPaletteMaterials(getPaletteColor(settings.paletteColorId))
    } else {
      assignOriginalMaterials()
    }
    solidWireMaterial.color.set(wireColor)
    dashedWireMaterial.color.set(wireColor)
    if (activeWireStyle !== settings.wireframeStyle) {
      const wireMaterial = settings.wireframeStyle === 'dashed'
        ? dashedWireMaterial
        : solidWireMaterial
      generatedWireObjects.forEach((wire) => {
        wire.material = wireMaterial
        if (settings.wireframeStyle === 'dashed') {
          wire.computeLineDistances()
        }
      })
      activeWireStyle = settings.wireframeStyle
    }
  }

  const dispose = () => {
    if (disposed) {
      return
    }
    disposed = true
    root.remove(content)

    const geometries = new Set<THREE.BufferGeometry>(generatedWireGeometries)
    const materials = new Set<THREE.Material>([
      defaultMaterial,
      solidWireMaterial,
      dashedWireMaterial,
      ...paletteMaterials.values()
    ])
    originalBindings.forEach(({ material }) => {
      const entries = Array.isArray(material) ? material : [material]
      entries.forEach((entry) => materials.add(entry))
    })
    const textures = new Set<THREE.Texture>()

    content.traverse((object) => {
      const renderable = object as THREE.Mesh | THREE.Line | THREE.Points
      if (renderable.geometry instanceof THREE.BufferGeometry) {
        geometries.add(renderable.geometry)
      }
      if ('material' in renderable && renderable.material) {
        const objectMaterials = Array.isArray(renderable.material)
          ? renderable.material
          : [renderable.material]
        objectMaterials.forEach((material) => materials.add(material))
      }
    })

    materials.forEach((material) => collectMaterialTextures(material, textures))
    textures.forEach((texture) => {
      const sourceData = texture.source.data as { close?: () => void } | null
      sourceData?.close?.()
      texture.dispose()
    })
    geometries.forEach((geometry) => geometry.dispose())
    materials.forEach((material) => material.dispose())
    paletteMaterials.clear()
  }

  const uniqueOriginalMaterials = new Set<THREE.Material>()
  originalBindings.forEach(({ material }) => {
    const entries = Array.isArray(material) ? material : [material]
    entries.forEach((entry) => uniqueOriginalMaterials.add(entry))
  })
  const textures = new Set<THREE.Texture>()
  uniqueOriginalMaterials.forEach((material) => collectMaterialTextures(material, textures))

  return {
    name,
    format,
    root,
    hasSurfaces: surfaceMeshes.length > 0,
    hasImportedMaterials,
    warnings,
    stats: {
      loadTimeMs: 0,
      vertices: sourceVertexCount,
      triangles: triangleCount,
      edges: generatedWireGeometries.reduce((count, geometry) => {
        return count + (geometry.index?.count ?? geometry.getAttribute('position')?.count ?? 0) / 2
      }, 0),
      materials: uniqueOriginalMaterials.size,
      textures: textures.size,
      wireframeGenerationMs
    },
    applyViewerSettings,
    dispose
  }
}

const createMaterialFromDefinition = (definition: ProjectionMaterialDefinition) =>
  new THREE.MeshStandardMaterial({
    name: definition.name,
    color: definition.color,
    opacity: definition.opacity,
    transparent: definition.opacity < 1,
    depthWrite: definition.opacity >= 1,
    metalness: 0,
    roughness: definition.roughness,
    emissive: definition.emissive,
    side: THREE.FrontSide
  })

const findRelatedFile = (bundle: ProjectionModelFileBundle, uri: string) => {
  const normalizedUri = decodeURIComponent(uri).replace(/\\/g, '/').replace(/^\.\//, '')
  return bundle.relatedFiles.find((relatedFile) => {
    const candidate = decodeURIComponent(relatedFile.uri).replace(/\\/g, '/').replace(/^\.\//, '')
    return candidate === normalizedUri || candidate.split('/').at(-1) === normalizedUri.split('/').at(-1)
  })?.file
}

export const createProjectionModelAsset = async (
  model: ProjectionModel,
  bundle: ProjectionModelFileBundle
): Promise<ProjectionModelAsset> => {
  const content = new THREE.Group()
  const materialByName = new Map(
    model.materials.map((definition) => [definition.name, createMaterialFromDefinition(definition)])
  )
  const surfaceMeshes: THREE.Mesh[] = []
  const warnings = [...model.warnings]
  const textureLoader = new THREE.TextureLoader()
  const objectUrls: string[] = []

  await Promise.all(model.materials.map(async (definition) => {
    if (!definition.mapUri) {
      return
    }
    const file = findRelatedFile(bundle, definition.mapUri)
    if (!file) {
      warnings.push(`Missing OBJ texture: ${definition.mapUri}`)
      return
    }
    const objectUrl = URL.createObjectURL(file)
    objectUrls.push(objectUrl)
    try {
      const texture = await textureLoader.loadAsync(objectUrl)
      texture.colorSpace = THREE.SRGBColorSpace
      materialByName.get(definition.name)!.map = texture
      materialByName.get(definition.name)!.needsUpdate = true
    } catch {
      warnings.push(`Unable to load OBJ texture: ${definition.mapUri}`)
    }
  }))
  objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl))

  const defaultSourceMaterial = new THREE.MeshStandardMaterial({
    color: '#e7e7e7',
    metalness: 0,
    roughness: 0.65,
    flatShading: model.format === 'stl'
  })

  model.meshes.forEach((primitive) => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(primitive.positions, 3))
    geometry.setIndex(new THREE.BufferAttribute(primitive.indices, 1))
    if (primitive.normals) {
      geometry.setAttribute('normal', new THREE.BufferAttribute(primitive.normals, 3))
      geometry.normalizeNormals()
    } else {
      geometry.computeVertexNormals()
    }
    if (primitive.uvs) {
      geometry.setAttribute('uv', new THREE.BufferAttribute(primitive.uvs, 2))
    }
    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()
    const material = primitive.materialName
      ? materialByName.get(primitive.materialName) ?? defaultSourceMaterial
      : defaultSourceMaterial
    if (primitive.materialName && !materialByName.has(primitive.materialName)) {
      warnings.push(`OBJ material not found: ${primitive.materialName}`)
    }
    const mesh = new THREE.Mesh(geometry, material)
    mesh.name = primitive.name
    surfaceMeshes.push(mesh)
    content.add(mesh)
  })

  const wireGeometry = new THREE.BufferGeometry()
  wireGeometry.setAttribute('position', new THREE.BufferAttribute(model.wireframe.positions, 3))
  wireGeometry.setIndex(new THREE.BufferAttribute(model.wireframe.indices, 1))
  const wire = new THREE.LineSegments(wireGeometry, new THREE.LineBasicMaterial())
  content.add(wire)

  return createAsset({
    name: model.name,
    format: model.format,
    content,
    surfaceMeshes,
    wireObjects: [],
    generatedWireGeometries: [wireGeometry],
    generatedWireObjects: [wire],
    hasImportedMaterials: model.materials.length > 0,
    warnings,
    sourceVertexCount: model.sourceVertexCount,
    triangleCount: model.triangleCount,
    wireframeGenerationMs: 0
  })
}

export const createGltfProjectionModelAsset = (
  content: THREE.Group,
  name: string,
  format: 'gltf' | 'glb',
  warnings: string[],
  hasImportedMaterials = true
): ProjectionModelAsset => {
  const surfaceMeshes: THREE.Mesh[] = []
  const importedLines: Array<THREE.Line | THREE.LineSegments | THREE.LineLoop> = []
  const generatedWireObjects: THREE.LineSegments[] = []
  const generatedWireGeometries: THREE.BufferGeometry[] = []
  let sourceVertexCount = 0
  let triangleCount = 0
  const wireStart = performance.now()

  content.updateMatrixWorld(true)
  content.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) {
      const mesh = object as THREE.Mesh
      surfaceMeshes.push(mesh)
      const positions = mesh.geometry.getAttribute('position')
      sourceVertexCount += positions?.count ?? 0
      triangleCount += mesh.geometry.index
        ? mesh.geometry.index.count / 3
        : (positions?.count ?? 0) / 3
    } else if (
      (object as THREE.Line).isLine ||
      (object as THREE.LineSegments).isLineSegments ||
      (object as THREE.LineLoop).isLineLoop
    ) {
      importedLines.push(object as THREE.Line | THREE.LineSegments | THREE.LineLoop)
    }
  })

  surfaceMeshes.forEach((mesh) => {
    const edgeGeometry = new THREE.EdgesGeometry(mesh.geometry, 1)
    const wire = new THREE.LineSegments(edgeGeometry, new THREE.LineBasicMaterial())
    wire.name = `${mesh.name || 'mesh'} feature edges`
    mesh.add(wire)
    generatedWireGeometries.push(edgeGeometry)
    generatedWireObjects.push(wire)
  })

  return createAsset({
    name,
    format,
    content,
    surfaceMeshes,
    wireObjects: importedLines,
    generatedWireGeometries,
    generatedWireObjects,
    hasImportedMaterials,
    warnings,
    sourceVertexCount,
    triangleCount,
    wireframeGenerationMs: performance.now() - wireStart
  })
}

export const createDefaultProjectionModelAsset = (): ProjectionModelAsset => {
  const content = new THREE.Group()
  const preview = new THREE.Group()
  preview.rotation.set(-Math.PI / 6, Math.PI / 4, 0)
  const geometry = new THREE.BoxGeometry(2, 2, 2)
  const material = new THREE.MeshStandardMaterial({
    color: '#e7e7e7',
    metalness: 0,
    roughness: 0.65
  })
  const mesh = new THREE.Mesh(geometry, material)
  const edgeGeometry = new THREE.EdgesGeometry(geometry, 1)
  const wire = new THREE.LineSegments(edgeGeometry, new THREE.LineBasicMaterial())
  preview.add(mesh, wire)
  content.add(preview)

  return createAsset({
    name: 'Default cube',
    format: 'default',
    content,
    surfaceMeshes: [mesh],
    wireObjects: [],
    generatedWireGeometries: [edgeGeometry],
    generatedWireObjects: [wire],
    hasImportedMaterials: false,
    warnings: [],
    sourceVertexCount: geometry.getAttribute('position').count,
    triangleCount: geometry.index ? geometry.index.count / 3 : 12,
    wireframeGenerationMs: 0
  })
}
