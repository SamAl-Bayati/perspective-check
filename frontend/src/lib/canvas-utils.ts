import {
  type ClickInputId,
  type DragBehaviorId,
  type DragInputId
} from '@/constants/canvas-navigation'

export type Point = { x: number, y: number }
export type DragMode = 'none' | 'boxSelect' | 'orbit' | 'pan' | 'dollyZoom'

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

export const clampRange = (value: number, min: number, max: number) => {
  if (min <= max) {
    return clamp(value, min, max)
  }

  return (min + max) / 2
}

export const getLocalPointFromRect = (rect: DOMRect, clientX: number, clientY: number): Point => ({
  x: clientX - rect.left,
  y: clientY - rect.top
})

export const getDragModeForBehavior = (behavior: DragBehaviorId): DragMode => {
  if (behavior === 'boxSelect') {
    return 'boxSelect'
  }
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

export const getClickInputForEvent = (event: PointerEvent): ClickInputId | null => {
  if (event.altKey || event.shiftKey || event.ctrlKey || event.metaKey) {
    return null
  }

  if (event.button === 0) {
    return 'leftClick'
  }
  if (event.button === 1) {
    return 'middleClick'
  }
  if (event.button === 2) {
    return 'rightClick'
  }

  return null
}
