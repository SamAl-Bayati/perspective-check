import {
  type ClickInputId,
  type DragBehaviorId,
  type DragInputId
} from '@/constants/canvas-navigation'

export type Point = { x: number, y: number }
export type Bounds = { minX: number, maxX: number, minY: number, maxY: number }
export type DragMode = 'none' | 'boxSelect' | 'orbit' | 'pan' | 'dollyZoom'

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

export const clampRange = (value: number, min: number, max: number) => {
  if (min <= max) {
    return clamp(value, min, max)
  }

  return (min + max) / 2
}

export const getPointBounds = (points: Point[]): Bounds =>
  points.reduce(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      maxX: Math.max(bounds.maxX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxY: Math.max(bounds.maxY, point.y)
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
  )

export const getLocalPointFromRect = (rect: DOMRect, clientX: number, clientY: number): Point => ({
  x: clientX - rect.left,
  y: clientY - rect.top
})

export const projectCubeVertices = (
  vertices: [number, number, number][],
  yawAngle: number,
  pitchAngle: number,
  cameraDistance: number
) => {
  const cosY = Math.cos(yawAngle)
  const sinY = Math.sin(yawAngle)
  const cosX = Math.cos(pitchAngle)
  const sinX = Math.sin(pitchAngle)

  return vertices.map(([x, y, z]) => {
    const rotatedX = x * cosY - z * sinY
    const rotatedZ = x * sinY + z * cosY
    const tiltedY = y * cosX - rotatedZ * sinX
    const tiltedZ = y * sinX + rotatedZ * cosX
    const depth = tiltedZ + cameraDistance

    return {
      x: rotatedX / depth,
      y: tiltedY / depth
    }
  })
}

export const fitProjectedPointsToViewport = (
  projectedPoints: Point[],
  viewportWidth: number,
  viewportHeight: number,
  viewportRatio: number
) => {
  const projectedBounds = getPointBounds(projectedPoints)
  const projectedWidth = projectedBounds.maxX - projectedBounds.minX
  const projectedHeight = projectedBounds.maxY - projectedBounds.minY
  const projectedMaxDimension = Math.max(projectedWidth, projectedHeight) || 1
  const targetViewportSize = Math.min(viewportWidth, viewportHeight) * viewportRatio
  const perspectiveScale = targetViewportSize / projectedMaxDimension
  const projectedCenterX = (projectedBounds.minX + projectedBounds.maxX) / 2
  const projectedCenterY = (projectedBounds.minY + projectedBounds.maxY) / 2
  const centerX = viewportWidth / 2
  const centerY = viewportHeight / 2

  const screenPoints = projectedPoints.map((point) => ({
    x: centerX + (point.x - projectedCenterX) * perspectiveScale,
    y: centerY + (point.y - projectedCenterY) * perspectiveScale
  }))

  return {
    screenPoints,
    bounds: getPointBounds(screenPoints)
  }
}

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
