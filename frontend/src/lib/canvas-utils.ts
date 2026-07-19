import {
  type DragBehaviorId,
  type DragInputId
} from '@/constants/canvas-navigation'

export type DragMode = 'none' | 'orbit' | 'pan' | 'dollyZoom'

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

export const clampRange = (value: number, min: number, max: number) => {
  if (min <= max) {
    return clamp(value, min, max)
  }

  return (min + max) / 2
}

export const getDragModeForBehavior = (behavior: DragBehaviorId): DragMode => {
  if (behavior === 'orbit') {
    return 'orbit'
  }
  if (behavior === 'pan') {
    return 'pan'
  }
  if (behavior === 'dollyZoom') {
    return 'dollyZoom'
  }

  return 'none'
}

export const getDragInputForEvent = (event: PointerEvent): DragInputId | null => {
  if (event.button === 0 && event.altKey) {
    return 'altLeftDrag'
  }
  if (event.button === 0 && event.shiftKey) {
    return 'shiftLeftDrag'
  }
  if (event.button === 1 && event.altKey) {
    return 'altMiddleDrag'
  }
  if (event.button === 1 && event.shiftKey) {
    return 'shiftMiddleDrag'
  }
  if (event.button === 2 && event.altKey) {
    return 'altRightDrag'
  }
  if (event.button === 0) {
    return 'leftDrag'
  }
  if (event.button === 1) {
    return 'middleDrag'
  }

  return null
}
