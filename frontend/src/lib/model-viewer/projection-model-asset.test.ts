import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'

import {
  DEFAULT_MODEL_VIEWER_SETTINGS,
  MODEL_MATERIAL_PALETTE,
  type ModelViewerSettings
} from '@/constants/model-materials'
import {
  createDefaultProjectionModelAsset,
  createGltfProjectionModelAsset,
  createProjectionModelAsset,
  getInitialViewerSettingsForAsset
} from '@/lib/model-viewer/projection-model-asset'
import { parseObjModel } from '@/lib/model-pipelines/obj/parse-obj-model'

const createSettings = (changes: Partial<ModelViewerSettings> = {}): ModelViewerSettings => ({
  ...DEFAULT_MODEL_VIEWER_SETTINGS,
  defaultMaterial: { ...DEFAULT_MODEL_VIEWER_SETTINGS.defaultMaterial },
  ...changes
})

const getSurfaceMesh = (root: THREE.Object3D) => {
  let result: unknown = null
  root.traverse((object) => {
    if (!result && (object as THREE.Mesh).isMesh) {
      result = object
    }
  })
  if (!(result instanceof THREE.Mesh)) {
    throw new Error('Expected a surface mesh')
  }
  return result
}

describe('projection model material assets', () => {
  it('creates a visible default cube asset when no model is loaded', () => {
    const asset = createDefaultProjectionModelAsset()
    asset.applyViewerSettings(createSettings(), '#000000')

    const mesh = getSurfaceMesh(asset.root)
    expect(asset.root.children).not.toHaveLength(0)
    expect(mesh.visible).toBe(true)
    expect(mesh.geometry.getAttribute('position').count).toBeGreaterThan(0)
    expect(mesh.parent?.rotation.x).not.toBe(0)
    expect(mesh.parent?.rotation.y).not.toBe(0)

    asset.dispose()
  })

  it('selects imported OBJ MTL materials initially and keeps neutral as an override', async () => {
    const model = parseObjModel(`mtllib model.mtl
v 0 0 0
v 1 0 0
v 0 1 0
usemtl Blue
f 1 2 3`, 'model.obj', [{
      uri: 'model.mtl',
      source: `newmtl Blue
Kd 0 0 1`
    }])
    const asset = await createProjectionModelAsset(model, {
      entryFile: new File([''], 'model.obj'),
      relatedFiles: []
    })
    const initial = getInitialViewerSettingsForAsset(asset, createSettings())

    expect(initial.materialMode).toBe('original')
    asset.applyViewerSettings(initial, '#000000')
    expect((getSurfaceMesh(asset.root).material as THREE.MeshStandardMaterial).color.getHexString())
      .toBe('0000ff')
    asset.applyViewerSettings({ ...initial, materialMode: 'default' }, '#000000')
    expect((getSurfaceMesh(asset.root).material as THREE.MeshStandardMaterial).color.getHexString())
      .toBe('e7e7e7')
    asset.dispose()
  })

  it('switches repeatedly between original, palette, and neutral materials without mutation', () => {
    const content = new THREE.Group()
    const original = new THREE.MeshStandardMaterial({
      color: '#ff0000',
      roughness: 0.2,
      metalness: 0.8
    })
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), original)
    content.add(mesh)
    const asset = createGltfProjectionModelAsset(content, 'box.glb', 'glb', [], true)

    asset.applyViewerSettings(createSettings({ materialMode: 'palette', paletteColorId: 'teal' }), '#000000')
    const paletteMaterial = getSurfaceMesh(asset.root).material as THREE.MeshStandardMaterial
    expect(paletteMaterial.color.getHexString()).toBe(
      MODEL_MATERIAL_PALETTE.find((entry) => entry.id === 'teal')!.color.slice(1)
    )
    expect(paletteMaterial.roughness).toBe(0.2)
    expect(paletteMaterial.metalness).toBe(0.8)
    expect(original.color.getHexString()).toBe('ff0000')

    asset.applyViewerSettings(createSettings({ materialMode: 'default' }), '#000000')
    expect(getSurfaceMesh(asset.root).material).not.toBe(original)
    asset.applyViewerSettings(createSettings({ materialMode: 'original' }), '#ffffff')
    expect(getSurfaceMesh(asset.root).material).toBe(original)
    asset.applyViewerSettings(createSettings({ materialMode: 'palette', paletteColorId: 'teal' }), '#ffffff')
    expect(getSurfaceMesh(asset.root).material).toBe(paletteMaterial)

    asset.dispose()
  })

  it('generates feature edges without the coplanar triangle diagonal', () => {
    const content = new THREE.Group()
    content.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshStandardMaterial()))
    const asset = createGltfProjectionModelAsset(content, 'plane.gltf', 'gltf', [], false)
    let edgePositionCount = 0
    asset.root.traverse((object) => {
      if ((object as THREE.LineSegments).isLineSegments) {
        edgePositionCount += (object as THREE.LineSegments).geometry.getAttribute('position').count
      }
    })

    expect(edgePositionCount).toBe(8)
    expect(asset.hasImportedMaterials).toBe(false)
    asset.dispose()
  })

  it('disposes owned source geometry and materials once', () => {
    const content = new THREE.Group()
    const geometry = new THREE.BoxGeometry()
    const material = new THREE.MeshStandardMaterial()
    const geometryDispose = vi.spyOn(geometry, 'dispose')
    const materialDispose = vi.spyOn(material, 'dispose')
    content.add(new THREE.Mesh(geometry, material))
    const asset = createGltfProjectionModelAsset(content, 'box.glb', 'glb', [], true)
    asset.applyViewerSettings(createSettings({ materialMode: 'default' }), '#000000')

    asset.dispose()
    asset.dispose()

    expect(geometryDispose).toHaveBeenCalledTimes(1)
    expect(materialDispose).toHaveBeenCalledTimes(1)
  })
})
