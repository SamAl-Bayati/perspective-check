import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useRef,
  useState
} from 'react'

import {
  type CanvasNavigationPreferences,
  type ClickBehaviorId,
  type ClickInputId
} from '@/constants/canvas-navigation'
import {
  CANVAS_INTERACTION,
  CANVAS_RENDERING,
  CUBE_EDGES,
  CUBE_VERTICES,
  PROJECTION_CONFIG
} from '@/constants/canvas-projection'
import {
  type DragMode,
  clamp,
  clampRange,
  fitProjectedPointsToViewport,
  getClickInputForEvent,
  getDragInputForEvent,
  getDragModeForBehavior,
  getLocalPointFromRect,
  projectCubeVertices
} from '@/lib/canvas-utils'
import { type ResolvedTheme } from '@/constants/theme'
import { supportsTransformShortcut } from '@/lib/keybind-utils'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger
} from '@/components/ui/context-menu'

type StrokeStyleMode = 'solid' | 'dashed'
type BoxSelectionRect = { left: number, top: number, width: number, height: number }

type PerspectiveProjectionCanvasProps = {
  className?: string
  navigationPreferences: CanvasNavigationPreferences
  resolvedTheme: ResolvedTheme
}

export function PerspectiveProjectionCanvas({
  className,
  navigationPreferences,
  resolvedTheme
}: PerspectiveProjectionCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const scheduleDrawRef = useRef<() => void>(() => undefined)
  const preferencesRef = useRef<CanvasNavigationPreferences>(navigationPreferences)
  const strokeStyleRef = useRef<StrokeStyleMode>('solid')
  const suppressContextMenuUntilRef = useRef(0)
  const allowProgrammaticContextMenuRef = useRef(false)
  const [strokeStyle, setStrokeStyle] = useState<StrokeStyleMode>('solid')
  const [boxSelectionRect, setBoxSelectionRect] = useState<BoxSelectionRect | null>(null)
  preferencesRef.current = navigationPreferences

  const openContextMenuAtClient = (clientX: number, clientY: number) => {
    const trigger = containerRef.current
    if (!trigger) {
      return
    }

    allowProgrammaticContextMenuRef.current = true

    trigger.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY,
        button: 2
      })
    )
  }

  const handleContextMenuCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (allowProgrammaticContextMenuRef.current) {
      allowProgrammaticContextMenuRef.current = false
      return
    }

    const nativeEvent = event.nativeEvent
    if (nativeEvent.timeStamp <= suppressContextMenuUntilRef.current) {
      suppressContextMenuUntilRef.current = 0
      event.preventDefault()
      return
    }

    const rightClickBehavior = preferencesRef.current.clickBindings.rightClick
    if (rightClickBehavior !== 'openContextMenu') {
      event.preventDefault()
    }
  }

  useEffect(() => {
    scheduleDrawRef.current()
  }, [navigationPreferences, resolvedTheme])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) {
      return undefined
    }

    const context = canvas.getContext('2d')
    if (!context) {
      return undefined
    }

    let frameId: number | null = null
    let cssWidth = 0
    let cssHeight = 0
    let yaw = 0
    let pitch = 0
    let yawVelocity = 0
    let pitchVelocity = 0
    let panX = 0
    let panY = 0
    let zoom = 1
    let cameraDistance: number = PROJECTION_CONFIG.cameraDistanceDefault
    let lastFrameTime: number | null = null
    let dragMode: DragMode = 'none'
    let activePointerId: number | null = null
    let dragStartClientX = 0
    let dragStartClientY = 0
    let dragStartYaw = 0
    let dragStartPitch = 0
    let dragStartPanX = 0
    let dragStartPanY = 0
    let dragStartZoom = 1
    let dragStartDistance: number = PROJECTION_CONFIG.cameraDistanceDefault
    let dragLastClientX = 0
    let dragLastClientY = 0
    let dragLastTime: number | null = null
    let selectionStartX = 0
    let selectionStartY = 0
    let boxSelectionMoved = false
    let pointerDownClientX = 0
    let pointerDownClientY = 0
    let pointerDownMoved = false
    let pointerDownPointerId: number | null = null
    let pointerDownClickInput: ClickInputId | null = null

    const applyClickBehavior = (behavior: ClickBehaviorId, clientX: number, clientY: number) => {
      if (behavior === 'openContextMenu') {
        openContextMenuAtClient(clientX, clientY)
      }
    }

    const resetPointerDownState = () => {
      pointerDownMoved = false
      pointerDownPointerId = null
      pointerDownClickInput = null
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

      if (dragMode === 'none' && deltaSeconds > 0) {
        yaw += yawVelocity * deltaSeconds
        pitch += pitchVelocity * deltaSeconds

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

      const projectedPoints = projectCubeVertices(
        CUBE_VERTICES,
        yaw,
        pitch,
        cameraDistance
      )

      const { screenPoints: centeredPoints, bounds: centeredBounds } = fitProjectedPointsToViewport(
        projectedPoints,
        cssWidth,
        cssHeight,
        PROJECTION_CONFIG.viewportRatioDefault * zoom
      )

      const visibleMargin = Math.max(
        CANVAS_INTERACTION.minVisiblePanMarginPx,
        Math.min(cssWidth, cssHeight) * PROJECTION_CONFIG.panVisibleMarginRatio
      )
      const panXMin = visibleMargin - centeredBounds.maxX
      const panXMax = cssWidth - visibleMargin - centeredBounds.minX
      const panYMin = visibleMargin - centeredBounds.maxY
      const panYMax = cssHeight - visibleMargin - centeredBounds.minY
      panX = clampRange(panX, panXMin, panXMax)
      panY = clampRange(panY, panYMin, panYMax)

      const screenPoints = centeredPoints.map((point) => ({
        x: point.x + panX,
        y: point.y + panY
      }))
      const strokeColor =
        getComputedStyle(canvas).getPropertyValue(CANVAS_RENDERING.strokeVariable).trim() ||
        CANVAS_RENDERING.strokeFallbackColor

      context.beginPath()
      CUBE_EDGES.forEach(([startIndex, endIndex]) => {
        context.moveTo(screenPoints[startIndex].x, screenPoints[startIndex].y)
        context.lineTo(screenPoints[endIndex].x, screenPoints[endIndex].y)
      })

      if (strokeStyleRef.current === 'dashed') {
        context.setLineDash(CANVAS_RENDERING.dashedLinePattern)
      } else {
        context.setLineDash([])
      }

      context.strokeStyle = strokeColor
      context.lineWidth = CANVAS_RENDERING.strokeLineWidth
      context.globalAlpha = CANVAS_RENDERING.strokeAlpha
      context.stroke()
      context.setLineDash([])
      context.globalAlpha = 1

      if (dragMode === 'orbit' || yawVelocity !== 0 || pitchVelocity !== 0) {
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

    scheduleDrawRef.current = scheduleDraw

    const startDrag = (event: PointerEvent, mode: DragMode) => {
      dragMode = mode
      activePointerId = event.pointerId
      dragStartClientX = event.clientX
      dragStartClientY = event.clientY
      dragLastClientX = event.clientX
      dragLastClientY = event.clientY
      dragLastTime = event.timeStamp
      dragStartYaw = yaw
      dragStartPitch = pitch
      dragStartPanX = panX
      dragStartPanY = panY
      dragStartZoom = zoom
      dragStartDistance = cameraDistance

      if (mode === 'orbit') {
        yawVelocity = 0
        pitchVelocity = 0
      }

      if (mode === 'boxSelect') {
        const local = getLocalPointFromRect(canvas.getBoundingClientRect(), event.clientX, event.clientY)
        selectionStartX = local.x
        selectionStartY = local.y
        boxSelectionMoved = false
        setBoxSelectionRect(null)
      }

      if (canvas.setPointerCapture) {
        canvas.setPointerCapture(event.pointerId)
      }
    }

    const endDrag = (event: PointerEvent) => {
      if (activePointerId !== event.pointerId) {
        return
      }

      if (dragMode === 'boxSelect') {
        setBoxSelectionRect(null)
      }

      if (dragMode === 'orbit') {
        const timeSinceLastOrbitMove =
          dragLastTime === null
            ? Number.POSITIVE_INFINITY
            : event.timeStamp - dragLastTime
        const orbitSpeed = Math.hypot(yawVelocity, pitchVelocity)
        const shouldKeepInertia =
          timeSinceLastOrbitMove <= CANVAS_INTERACTION.orbitInertiaReleaseMaxAgeMs &&
          orbitSpeed >= CANVAS_INTERACTION.orbitInertiaMinSpeed

        if (!shouldKeepInertia) {
          yawVelocity = 0
          pitchVelocity = 0
        } else if (orbitSpeed > CANVAS_INTERACTION.orbitInertiaMaxSpeed) {
          const speedScale = CANVAS_INTERACTION.orbitInertiaMaxSpeed / orbitSpeed
          yawVelocity *= speedScale
          pitchVelocity *= speedScale
        }
      } else {
        yawVelocity = 0
        pitchVelocity = 0
      }

      dragMode = 'none'
      activePointerId = null
      dragLastTime = null

      if (canvas.releasePointerCapture && canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId)
      }

      scheduleDraw()
    }

    const onPointerDown = (event: PointerEvent) => {
      container.focus()

      pointerDownClientX = event.clientX
      pointerDownClientY = event.clientY
      pointerDownMoved = false
      pointerDownPointerId = event.pointerId
      pointerDownClickInput = getClickInputForEvent(event)

      const dragInput = getDragInputForEvent(event)
      if (!dragInput) {
        return
      }

      const dragBehavior = preferencesRef.current.dragBindings[dragInput]
      const mode = getDragModeForBehavior(dragBehavior)

      if (dragInput === 'altRightDrag') {
        suppressContextMenuUntilRef.current =
          event.timeStamp + CANVAS_INTERACTION.contextMenuSuppressDurationMs
      }

      if (event.button === 1 || dragInput === 'altRightDrag') {
        event.preventDefault()
      }

      if (mode === 'none') {
        return
      }

      startDrag(event, mode)

      if (mode === 'orbit' || mode === 'pan' || mode === 'dollyZoom') {
        event.preventDefault()
      }

      scheduleDraw()
    }

    const onPointerMove = (event: PointerEvent) => {
      if (pointerDownPointerId === event.pointerId) {
        const deltaClickX = event.clientX - pointerDownClientX
        const deltaClickY = event.clientY - pointerDownClientY
        pointerDownMoved =
          pointerDownMoved ||
          Math.hypot(deltaClickX, deltaClickY) > CANVAS_INTERACTION.pointerMoveThreshold
      }

      if (event.pointerId !== activePointerId) {
        return
      }

      const deltaX = event.clientX - dragStartClientX
      const deltaY = event.clientY - dragStartClientY

      if (dragMode === 'orbit') {
        yaw = dragStartYaw + deltaX * PROJECTION_CONFIG.orbitSensitivity
        pitch = clamp(
          dragStartPitch + deltaY * PROJECTION_CONFIG.orbitSensitivity,
          -PROJECTION_CONFIG.maxPitch,
          PROJECTION_CONFIG.maxPitch
        )

        if (dragLastTime !== null) {
          const deltaSeconds = Math.max(
            CANVAS_INTERACTION.orbitVelocitySampleMinDeltaSeconds,
            (event.timeStamp - dragLastTime) / 1000
          )
          const deltaYaw = (event.clientX - dragLastClientX) * PROJECTION_CONFIG.orbitSensitivity
          const deltaPitch = (event.clientY - dragLastClientY) * PROJECTION_CONFIG.orbitSensitivity
          yawVelocity = deltaYaw / deltaSeconds
          pitchVelocity = deltaPitch / deltaSeconds
        }
      } else if (dragMode === 'pan') {
        panX = dragStartPanX + deltaX
        panY = dragStartPanY + deltaY
        yawVelocity = 0
        pitchVelocity = 0
      } else if (dragMode === 'dollyZoom') {
        const nextDistance = clamp(
          dragStartDistance + deltaY * PROJECTION_CONFIG.dollySensitivity,
          PROJECTION_CONFIG.cameraDistanceMin,
          PROJECTION_CONFIG.cameraDistanceMax
        )
        cameraDistance = nextDistance
        zoom = clamp(
          dragStartZoom * (nextDistance / dragStartDistance),
          PROJECTION_CONFIG.zoomMin,
          PROJECTION_CONFIG.zoomMax
        )
        yawVelocity = 0
        pitchVelocity = 0
      } else if (dragMode === 'boxSelect') {
        const local = getLocalPointFromRect(canvas.getBoundingClientRect(), event.clientX, event.clientY)
        const dragWidth = local.x - selectionStartX
        const dragHeight = local.y - selectionStartY
        boxSelectionMoved =
          boxSelectionMoved ||
          Math.hypot(dragWidth, dragHeight) > CANVAS_INTERACTION.pointerMoveThreshold

        if (boxSelectionMoved) {
          setBoxSelectionRect({
            left: Math.min(selectionStartX, local.x),
            top: Math.min(selectionStartY, local.y),
            width: Math.abs(dragWidth),
            height: Math.abs(dragHeight)
          })
        }
      }

      dragLastClientX = event.clientX
      dragLastClientY = event.clientY
      dragLastTime = event.timeStamp
      scheduleDraw()
    }

    const onPointerUp = (event: PointerEvent) => {
      if (pointerDownPointerId === event.pointerId && !pointerDownMoved && pointerDownClickInput) {
        const clickBehavior = preferencesRef.current.clickBindings[pointerDownClickInput]
        if (!(pointerDownClickInput === 'rightClick' && clickBehavior === 'openContextMenu')) {
          applyClickBehavior(clickBehavior, event.clientX, event.clientY)
        }
      }

      resetPointerDownState()
      endDrag(event)
    }

    const onPointerCancel = (event: PointerEvent) => {
      resetPointerDownState()
      endDrag(event)
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const factor = Math.exp(-event.deltaY * PROJECTION_CONFIG.wheelZoomSensitivity)
      zoom = clamp(zoom * factor, PROJECTION_CONFIG.zoomMin, PROJECTION_CONFIG.zoomMax)
      yawVelocity = 0
      pitchVelocity = 0
      scheduleDraw()
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }

      scheduleDrawRef.current = () => undefined
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('wheel', onWheel)
    }
  }, [])

  const toggleStrokeStyle = () => {
    setStrokeStyle((previous) => {
      const nextStrokeStyle = previous === 'solid' ? 'dashed' : 'solid'
      strokeStyleRef.current = nextStrokeStyle
      scheduleDrawRef.current()
      return nextStrokeStyle
    })
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!supportsTransformShortcut(event)) {
      return
    }

    event.preventDefault()
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={containerRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onContextMenuCapture={handleContextMenuCapture}
          className={`relative outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${className ?? ''}`}
        >
          <canvas
            ref={canvasRef}
            aria-label="Perspective projection canvas"
            className="h-full w-full touch-none"
          />
          {boxSelectionRect ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute rounded-sm border border-primary/70 bg-primary/10"
              style={{
                left: boxSelectionRect.left,
                top: boxSelectionRect.top,
                width: boxSelectionRect.width,
                height: boxSelectionRect.height
              }}
            />
          ) : null}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-52">
        <ContextMenuItem onSelect={toggleStrokeStyle}>
          <span>Stroke style</span>
          <span className="ml-auto text-xs uppercase tracking-wide text-muted-foreground">
            {strokeStyle}
          </span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
