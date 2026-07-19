import { describe, expect, it } from 'vitest'

import { inspectObjImportFile } from '@/lib/model-pipelines/obj/obj-import-utils'

describe('OBJ import preparation', () => {
  it('offers referenced MTL files as optional material sidecars', async () => {
    const file = new File([
      `mtllib materials.mtl
v 0 0 0
v 1 0 0
v 0 1 0
f 1 2 3`
    ], 'model.obj', { type: 'text/plain' })

    const preparation = await inspectObjImportFile(file)

    expect(preparation.requirements).toEqual([expect.objectContaining({
      uri: 'materials.mtl',
      kind: 'material',
      required: false
    })])
    expect(preparation.allowAdditionalFiles).toBe(true)
  })
})
