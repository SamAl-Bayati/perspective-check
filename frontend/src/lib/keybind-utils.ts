import {
  CANVAS_NAVIGATION_PREFERENCES_STORAGE_KEY,
  DEFAULT_CANVAS_NAVIGATION_PREFERENCES,
  DRAG_BEHAVIOR_OPTIONS,
  type CanvasNavigationPreferences,
  type DragBehaviorId
} from '@/constants/canvas-navigation'

export const getOptionLabel = <TOption extends { value: string, label: string }>(
  options: TOption[],
  value: string
) => options.find((option) => option.value === value)?.label ?? value

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isDragBehaviorId = (value: unknown): value is DragBehaviorId =>
  typeof value === 'string' && DRAG_BEHAVIOR_OPTIONS.some((option) => option.value === value)

const getDragBinding = (
  bindings: Record<string, unknown>,
  key: keyof CanvasNavigationPreferences['dragBindings']
) => {
  const fallback = DEFAULT_CANVAS_NAVIGATION_PREFERENCES.dragBindings[key]
  return isDragBehaviorId(bindings[key]) ? bindings[key] : fallback
}

const parseCanvasNavigationPreferences = (value: unknown): CanvasNavigationPreferences => {
  if (!isRecord(value)) {
    return DEFAULT_CANVAS_NAVIGATION_PREFERENCES
  }

  const dragBindings = isRecord(value.dragBindings) ? value.dragBindings : {}

  return {
    dragBindings: {
      leftDrag: getDragBinding(dragBindings, 'leftDrag'),
      shiftLeftDrag: getDragBinding(dragBindings, 'shiftLeftDrag'),
      middleDrag: getDragBinding(dragBindings, 'middleDrag'),
      shiftMiddleDrag: getDragBinding(dragBindings, 'shiftMiddleDrag'),
      altLeftDrag: getDragBinding(dragBindings, 'altLeftDrag'),
      altMiddleDrag: getDragBinding(dragBindings, 'altMiddleDrag'),
      altRightDrag: getDragBinding(dragBindings, 'altRightDrag')
    }
  }
}

export const getStoredCanvasNavigationPreferences = (): CanvasNavigationPreferences => {
  if (typeof window === 'undefined') {
    return DEFAULT_CANVAS_NAVIGATION_PREFERENCES
  }

  const persistedPreferences = window.localStorage.getItem(
    CANVAS_NAVIGATION_PREFERENCES_STORAGE_KEY
  )

  if (!persistedPreferences) {
    return DEFAULT_CANVAS_NAVIGATION_PREFERENCES
  }

  try {
    return parseCanvasNavigationPreferences(JSON.parse(persistedPreferences))
  } catch {
    return DEFAULT_CANVAS_NAVIGATION_PREFERENCES
  }
}

export const persistCanvasNavigationPreferences = (
  preferences: CanvasNavigationPreferences
) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(
    CANVAS_NAVIGATION_PREFERENCES_STORAGE_KEY,
    JSON.stringify(preferences)
  )
}
