import {
  useEffect,
  useRef
} from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

import {
  type CanvasNavigationPreferences
} from '@/constants/canvas-navigation'
import {
  CANVAS_INTERACTION,
  CANVAS_RENDERING,
  PROJECTION_CONFIG
} from '@/constants/canvas-projection'
import { type ModelViewerSettings } from '@/constants/model-materials'
import {
  type DragMode,
  clamp,
  clampRange,
  getDragInputForEvent,
  getDragModeForBehavior
} from '@/lib/canvas-utils'
import { type ResolvedTheme } from '@/constants/theme'
import { type ProjectionModelAsset } from '@/lib/model-viewer/projection-model-asset'

const getCameraFov = (viewportWidth: number, viewportHeight: number) => {
  const aspect = viewportWidth / Math.max(1, viewportHeight)
  const visibleHeightAtOrigin =
    2 / PROJECTION_CONFIG.viewportRatioDefault / Math.min(1, aspect)

  return THREE.MathUtils.radToDeg(
    2 * Math.atan(visibleHeightAtOrigin / (2 * PROJECTION_CONFIG.cameraDistanceDefault))
  )
}

const getWorldUnitsPerPixel = (camera: THREE.PerspectiveCamera, viewportHeight: number) =>
  2 *
  camera.position.z *
  Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) /
  Math.max(1, viewportHeight)

type PerspectiveProjectionCanvasProps = {
  className?: string
  navigationPreferences: CanvasNavigationPreferences
  projectionModel: ProjectionModelAsset
  resolvedTheme: ResolvedTheme
  viewerSettings: ModelViewerSettings
}

export function PerspectiveProjectionCanvas({
  className,
  navigationPreferences,
  projectionModel,
  resolvedTheme,
  viewerSettings
}: PerspectiveProjectionCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const scheduleDrawRef = useRef<() => void>(() => undefined)
  const preferencesRef = useRef<CanvasNavigationPreferences>(navigationPreferences)
  const modelRef = useRef<ProjectionModelAsset>(projectionModel)
  const viewerSettingsRef = useRef<ModelViewerSettings>(viewerSettings)
  preferencesRef.current = navigationPreferences
  modelRef.current = projectionModel
  viewerSettingsRef.current = viewerSettings

  useEffect(() => {
    scheduleDrawRef.current()
  }, [navigationPreferences, projectionModel, resolvedTheme, viewerSettings])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return undefined
    }

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        canvas,
        preserveDrawingBuffer: import.meta.env.DEV
      })
    } catch {
      return undefined
    }

    const scene = new THREE.Scene()
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1
    const roomEnvironment = new RoomEnvironment()
    const pmremGenerator = new THREE.PMREMGenerator(renderer)
    const environmentTarget = pmremGenerator.fromScene(roomEnvironment)
    roomEnvironment.dispose()
    scene.environment = environmentTarget.texture
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2)
    keyLight.position.set(3, 4, 5)
    const fillLight = new THREE.HemisphereLight(0xffffff, 0x5d6470, 0.55)
    scene.add(keyLight, fillLight)
    const camera = new THREE.PerspectiveCamera(
      getCameraFov(1, 1),
      1,
      0.01,
      100
    )
    const modelGroup = new THREE.Group()
    modelGroup.rotation.order = 'YXZ'
    scene.add(modelGroup)

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
    let renderedModel: ProjectionModelAsset | null = null

    const getStrokeColor = () =>
      getComputedStyle(canvas).getPropertyValue(CANVAS_RENDERING.strokeVariable).trim() ||
      CANVAS_RENDERING.strokeFallbackColor

    const updateModelGeometry = () => {
      const model = modelRef.current
      if (renderedModel !== model) {
        if (renderedModel) {
          modelGroup.remove(renderedModel.root)
        }
        renderedModel = model
        modelGroup.add(model.root)
      }
      model.applyViewerSettings(viewerSettingsRef.current, getStrokeColor())
    }

    const updateCamera = () => {
      camera.aspect = cssWidth / Math.max(1, cssHeight)
      camera.fov = getCameraFov(cssWidth, cssHeight)
      camera.position.z = cameraDistance / zoom

      const worldUnitsPerPixel = getWorldUnitsPerPixel(camera, cssHeight)
      camera.position.x = -panX * worldUnitsPerPixel
      camera.position.y = panY * worldUnitsPerPixel
      camera.rotation.set(0, 0, 0)
      camera.updateProjectionMatrix()
    }

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      cssWidth = rect.width
      cssHeight = rect.height
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.setSize(cssWidth, cssHeight, false)
      scheduleDraw()
    }

    const drawModel = (timeStamp: number) => {
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

      const maxPan = Math.max(cssWidth, cssHeight)
      panX = clampRange(panX, -maxPan, maxPan)
      panY = clampRange(panY, -maxPan, maxPan)
      modelGroup.rotation.set(pitch, yaw, 0)
      updateModelGeometry()
      updateCamera()
      const backgroundColor = getComputedStyle(canvas)
        .getPropertyValue(CANVAS_RENDERING.backgroundVariable)
        .trim() || CANVAS_RENDERING.backgroundFallbackColor
      scene.background = new THREE.Color(backgroundColor)
      renderer.render(scene, camera)

      if (dragMode === 'orbit' || yawVelocity !== 0 || pitchVelocity !== 0) {
        frameId = window.requestAnimationFrame(drawFrame)
      }
    }

    const drawFrame = (timeStamp: number) => {
      frameId = null
      drawModel(timeStamp)
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

      if (canvas.setPointerCapture) {
        canvas.setPointerCapture(event.pointerId)
      }
    }

    const endDrag = (event: PointerEvent) => {
      if (activePointerId !== event.pointerId) {
        return
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
      const dragInput = getDragInputForEvent(event)
      if (!dragInput) {
        return
      }

      const dragBehavior = preferencesRef.current.dragBindings[dragInput]
      const mode = getDragModeForBehavior(dragBehavior)

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
      }

      dragLastClientX = event.clientX
      dragLastClientY = event.clientY
      dragLastTime = event.timeStamp
      scheduleDraw()
    }

    const onPointerUp = (event: PointerEvent) => {
      endDrag(event)
    }

    const onPointerCancel = (event: PointerEvent) => {
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
      if (renderedModel) {
        modelGroup.remove(renderedModel.root)
      }
      environmentTarget.dispose()
      pmremGenerator.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <div
      onContextMenu={(event) => event.preventDefault()}
      className={`relative ${className ?? ''}`}
    >
      <canvas
        ref={canvasRef}
        aria-label="Perspective projection canvas"
        className="h-full w-full touch-none"
      />
    </div>
  )
}
