export const PROJECTION_CONFIG = {
  cameraDistanceDefault: 4,
  cameraDistanceMin: 2.2,
  cameraDistanceMax: 8,
  viewportRatioDefault: 0.66,
  zoomMin: 0.45,
  zoomMax: 2.8,
  orbitSensitivity: Math.PI / 540,
  maxPitch: Math.PI / 2.2,
  spinDamping: 2.6,
  spinEpsilon: 0.001,
  dollySensitivity: 0.01,
  wheelZoomSensitivity: 0.0016,
  panVisibleMarginRatio: 0.1
} as const

export const CANVAS_RENDERING = {
  backgroundFallbackColor: '#d7d9de',
  backgroundVariable: '--projection-background',
  strokeFallbackColor: '#000000',
  strokeVariable: '--projection-stroke',
  strokeLineWidth: 1.8,
  strokeAlpha: 0.95,
  dashedLinePattern: [8, 6] as const
} as const

export const CANVAS_INTERACTION = {
  orbitVelocitySampleMinDeltaSeconds: 0.01,
  orbitInertiaReleaseMaxAgeMs: 70,
  orbitInertiaMinSpeed: 0.6,
  orbitInertiaMaxSpeed: 14
} as const
