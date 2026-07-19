import { describe, expect, it } from 'vitest'

import {
  CANVAS_NAVIGATION_PRESETS,
  DRAG_BEHAVIOR_OPTIONS
} from '@/constants/canvas-navigation'
import { getDragModeForBehavior } from '@/lib/canvas-utils'

describe('editor workspace controls', () => {
  it('only exposes implemented viewport navigation actions', () => {
    const exposedBehaviors = DRAG_BEHAVIOR_OPTIONS
      .filter((option) => option.value !== 'none')
      .map((option) => option.value)

    expect(exposedBehaviors).toEqual(['orbit', 'pan', 'dollyZoom'])
    exposedBehaviors.forEach((behavior) => {
      expect(getDragModeForBehavior(behavior)).not.toBe('none')
    })
  })

  it('contains no selection placeholders in navigation presets', () => {
    Object.values(CANVAS_NAVIGATION_PRESETS).forEach((preset) => {
      expect(Object.values(preset.dragBindings)).not.toContain('boxSelect')
      expect('clickBindings' in preset).toBe(false)
    })
  })
})
