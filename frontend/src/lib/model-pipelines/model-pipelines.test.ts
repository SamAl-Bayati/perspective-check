import { describe, expect, it } from 'vitest'

import { parseObjModel } from '@/lib/model-pipelines/obj/parse-obj-model'
import { parseStlModel } from '@/lib/model-pipelines/stl/parse-stl-model'

describe('surface model parsers', () => {
  it('builds an indexed STL surface and triangle-edge wireframe', () => {
    const source = `solid triangle
facet normal 0 0 1
outer loop
vertex 0 0 0
vertex 1 0 0
vertex 0 1 0
endloop
endfacet
endsolid triangle`
    const model = parseStlModel(new TextEncoder().encode(source).buffer, 'triangle.stl')

    expect(model.meshes).toHaveLength(1)
    expect(model.meshes[0].indices).toHaveLength(3)
    expect(model.wireframe.indices).toHaveLength(6)
    expect(model.triangleCount).toBe(1)
  })

  it('uses valid OBJ MTL materials and preserves face perimeter edges', () => {
    const source = `mtllib sample.mtl
v 0 0 0
v 1 0 0
v 1 1 0
v 0 1 0
usemtl Painted
f 1 2 3 4`
    const model = parseObjModel(source, 'quad.obj', [{
      uri: 'sample.mtl',
      source: `newmtl Painted
Kd 0.2 0.4 0.6
Ns 100
d 0.75`
    }])

    expect(model.materials).toHaveLength(1)
    expect(model.materials[0]).toMatchObject({
      name: 'Painted',
      color: '#336699',
      opacity: 0.75
    })
    expect(model.meshes[0].materialName).toBe('Painted')
    expect(model.meshes[0].indices).toHaveLength(6)
    expect(model.wireframe.indices).toHaveLength(8)
  })

  it('keeps geometry when an OBJ material library is missing or invalid', () => {
    const source = `mtllib missing.mtl
v 0 0 0
v 1 0 0
v 0 1 0
usemtl Missing
f 1 2 3`
    const missing = parseObjModel(source, 'missing.obj')
    const invalid = parseObjModel(source, 'invalid.obj', [{
      uri: 'missing.mtl',
      source: 'Kd invalid values'
    }])

    expect(missing.meshes).toHaveLength(1)
    expect(missing.warnings).toContain('Missing OBJ material library: missing.mtl')
    expect(invalid.meshes).toHaveLength(1)
    expect(invalid.materials).toHaveLength(0)
  })

  it('recomputes invalid normals and skips degenerate faces safely', () => {
    const source = `v 0 0 0
v 1 0 0
v 0 1 0
vn 0 0 0
f 1//1 2//1 3//1
f 1 1 2`
    const model = parseObjModel(source, 'repair.obj')

    expect(model.triangleCount).toBe(1)
    expect(model.meshes[0].normals).toBeUndefined()
    expect(model.warnings.some((warning) => warning.includes('zero-length OBJ normal'))).toBe(true)
    expect(model.warnings.some((warning) => warning.includes('degenerate OBJ triangle'))).toBe(true)
  })

  it('parses a large indexed grid without duplicating every face position', () => {
    const size = 100
    const lines: string[] = []
    for (let y = 0; y <= size; y += 1) {
      for (let x = 0; x <= size; x += 1) {
        lines.push(`v ${x} ${y} 0`)
      }
    }
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const a = y * (size + 1) + x + 1
        const b = a + 1
        const d = a + size + 1
        const c = d + 1
        lines.push(`f ${a} ${b} ${c} ${d}`)
      }
    }

    const startedAt = performance.now()
    const model = parseObjModel(lines.join('\n'), 'large-grid.obj')

    expect(model.triangleCount).toBe(size * size * 2)
    expect(model.sourceVertexCount).toBe((size + 1) ** 2)
    expect(model.meshes[0].positions.length / 3).toBeLessThan(model.triangleCount * 3)
    expect(performance.now() - startedAt).toBeLessThan(3000)
  })
})
