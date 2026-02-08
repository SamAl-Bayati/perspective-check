import { useEffect, useRef } from 'react'

type Point = { x: number, y: number }
type Bounds = { minX: number, maxX: number, minY: number, maxY: number }

const CUBE_VERTICES: [number, number, number][] = [
  [-1, -1, -1],
  [1, -1, -1],
  [1, 1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
  [1, -1, 1],
  [1, 1, 1],
  [-1, 1, 1]
]

const CUBE_EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7]
]

const PROJECTION_CONFIG = {
  cameraDistance: 4,
  viewportRatio: 0.66,
  hoverMaxYaw: Math.PI / 9,
  hoverMaxPitch: Math.PI / 14,
  dragMaxYaw: Math.PI,
  dragMaxPitch: Math.PI / 2,
  spinDamping: 2.4,
  spinEpsilon: 0.001
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

const normalizePointerPosition = (
  clientX: number,
  clientY: number,
  rect: DOMRect
) => {
  const safeWidth = rect.width || 1
  const safeHeight = rect.height || 1
  const localX = clientX - rect.left
  const localY = clientY - rect.top

  return {
    x: clamp((localX / safeWidth) * 2 - 1, -1, 1),
    y: clamp((localY / safeHeight) * 2 - 1, -1, 1)
  }
}

const projectCubeVertices = (
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

const getPointBounds = (points: Point[]): Bounds =>
  points.reduce(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      maxX: Math.max(bounds.maxX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxY: Math.max(bounds.maxY, point.y)
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
  )

const fitProjectedPointsToViewport = (
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

type PerspectiveProjectionCanvasProps = {
  className?: string
}

export function PerspectiveProjectionCanvas({ className }: PerspectiveProjectionCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return undefined
    }

    const context = canvas.getContext('2d')
    if (!context) {
      return undefined
    }

    let frameId: number | null = null
    let cssWidth = 0
    let cssHeight = 0
    let pointerX = 0
    let pointerY = 0
    let baseYaw = 0
    let basePitch = 0
    let yawVelocity = 0
    let pitchVelocity = 0
    let isDragging = false
    let activePointerId: number | null = null
    let lastDragTime: number | null = null
    let lastFrameTime: number | null = null
    let dragYawOffset = 0
    let dragPitchOffset = 0
    let cubeBounds: Bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 }

    const updatePointer = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect()
      const nextPointer = normalizePointerPosition(clientX, clientY, rect)
      pointerX = nextPointer.x
      pointerY = nextPointer.y
    }

    const isInsideCubeBounds = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const localX = event.clientX - rect.left
      const localY = event.clientY - rect.top

      return (
        localX >= cubeBounds.minX &&
        localX <= cubeBounds.maxX &&
        localY >= cubeBounds.minY &&
        localY <= cubeBounds.maxY
      )
    }

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      const pixelRatio = window.devicePixelRatio || 1
      cssWidth = rect.width
      cssHeight = rect.height
      canvas.width = Math.max(1, Math.floor(cssWidth * pixelRatio))
      canvas.height = Math.max(1, Math.floor(cssHeight * pixelRatio))
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      scheduleDraw()
    }

    const drawCube = (timeStamp: number) => {
      context.clearRect(0, 0, cssWidth, cssHeight)

      const deltaSeconds = lastFrameTime === null ? 0 : (timeStamp - lastFrameTime) / 1000
      lastFrameTime = timeStamp

      if (!isDragging && deltaSeconds > 0) {
        baseYaw += yawVelocity * deltaSeconds
        basePitch += pitchVelocity * deltaSeconds

        const damping = Math.exp(-PROJECTION_CONFIG.spinDamping * deltaSeconds)
        yawVelocity *= damping
        pitchVelocity *= damping

        if (Math.abs(yawVelocity) < PROJECTION_CONFIG.spinEpsilon) {
          yawVelocity = 0
        }
        if (Math.abs(pitchVelocity) < PROJECTION_CONFIG.spinEpsilon) {
          pitchVelocity = 0
        }
      }

      const hoverYaw = isDragging ? 0 : pointerX * PROJECTION_CONFIG.hoverMaxYaw
      const hoverPitch = isDragging ? 0 : pointerY * PROJECTION_CONFIG.hoverMaxPitch
      const yawAngle = baseYaw + hoverYaw
      const pitchAngle = basePitch + hoverPitch

      const projectedPoints = projectCubeVertices(
        CUBE_VERTICES,
        yawAngle,
        pitchAngle,
        PROJECTION_CONFIG.cameraDistance
      )

      const { screenPoints, bounds } = fitProjectedPointsToViewport(
        projectedPoints,
        cssWidth,
        cssHeight,
        PROJECTION_CONFIG.viewportRatio
      )
      cubeBounds = bounds
      const strokeColor =
        getComputedStyle(canvas).getPropertyValue('--primary').trim() || '#3b82f6'

      context.beginPath()
      CUBE_EDGES.forEach(([startIndex, endIndex]) => {
        context.moveTo(screenPoints[startIndex].x, screenPoints[startIndex].y)
        context.lineTo(screenPoints[endIndex].x, screenPoints[endIndex].y)
      })

      context.strokeStyle = strokeColor
      context.lineWidth = 1.8
      context.globalAlpha = 0.95
      context.stroke()
      context.globalAlpha = 1

      if (isDragging || yawVelocity !== 0 || pitchVelocity !== 0) {
        frameId = window.requestAnimationFrame(drawFrame)
      }
    }

    const drawFrame = (timeStamp: number) => {
      frameId = null
      drawCube(timeStamp)
    }

    const scheduleDraw = () => {
      if (frameId !== null) {
        return
      }
      frameId = window.requestAnimationFrame(drawFrame)
    }

    const onPointerMove = (event: PointerEvent) => {
      updatePointer(event.clientX, event.clientY)

      if (isDragging && event.pointerId === activePointerId) {
        const dragYaw = pointerX * PROJECTION_CONFIG.dragMaxYaw + dragYawOffset
        const dragPitch = pointerY * PROJECTION_CONFIG.dragMaxPitch + dragPitchOffset
        const deltaSeconds =
          lastDragTime === null
            ? 0
            : Math.max(0.001, (event.timeStamp - lastDragTime) / 1000)

        if (deltaSeconds > 0) {
          yawVelocity = (dragYaw - baseYaw) / deltaSeconds
          pitchVelocity = (dragPitch - basePitch) / deltaSeconds
        }

        baseYaw = dragYaw
        basePitch = dragPitch
        lastDragTime = event.timeStamp
      }

      scheduleDraw()
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!isInsideCubeBounds(event)) {
        return
      }

      updatePointer(event.clientX, event.clientY)
      isDragging = true
      activePointerId = event.pointerId
      lastDragTime = event.timeStamp

      const currentYaw = baseYaw + pointerX * PROJECTION_CONFIG.hoverMaxYaw
      const currentPitch = basePitch + pointerY * PROJECTION_CONFIG.hoverMaxPitch
      baseYaw = currentYaw
      basePitch = currentPitch
      dragYawOffset = currentYaw - pointerX * PROJECTION_CONFIG.dragMaxYaw
      dragPitchOffset = currentPitch - pointerY * PROJECTION_CONFIG.dragMaxPitch
      yawVelocity = 0
      pitchVelocity = 0

      if (canvas.setPointerCapture) {
        canvas.setPointerCapture(event.pointerId)
      }

      scheduleDraw()
    }

    const onPointerUp = (event: PointerEvent) => {
      if (!isDragging || event.pointerId !== activePointerId) {
        return
      }

      isDragging = false
      activePointerId = null
      lastDragTime = null

      if (canvas.releasePointerCapture && canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId)
      }

      scheduleDraw()
    }

    const onPointerLeave = () => {
      if (isDragging) {
        return
      }

      pointerX = 0
      pointerY = 0
      scheduleDraw()
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointerleave', onPointerLeave)

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }

      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointerleave', onPointerLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-label="Perspective projection canvas"
      className={className}
    />
  )
}
