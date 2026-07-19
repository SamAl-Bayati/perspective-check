export type DragInputId =
  | 'leftDrag'
  | 'shiftLeftDrag'
  | 'middleDrag'
  | 'shiftMiddleDrag'
  | 'altLeftDrag'
  | 'altMiddleDrag'
  | 'altRightDrag'

export type DragBehaviorId = 'orbit' | 'pan' | 'dollyZoom' | 'none'

export type CanvasNavigationPreferences = {
  dragBindings: Record<DragInputId, DragBehaviorId>
}

export type CanvasNavigationPresetId = 'intuitive' | 'cad' | 'blender'

type Option<TValue extends string> = {
  value: TValue
  label: string
}

export const DRAG_INPUT_OPTIONS: Option<DragInputId>[] = [
  { value: 'leftDrag', label: 'Left click drag' },
  { value: 'shiftLeftDrag', label: 'Shift + left click drag' },
  { value: 'middleDrag', label: 'Middle mouse drag' },
  { value: 'shiftMiddleDrag', label: 'Shift + middle mouse drag' },
  { value: 'altLeftDrag', label: 'Alt + left click drag' },
  { value: 'altMiddleDrag', label: 'Alt + middle mouse drag' },
  { value: 'altRightDrag', label: 'Alt + right click drag' }
]

export const DRAG_BEHAVIOR_OPTIONS: Option<DragBehaviorId>[] = [
  { value: 'orbit', label: 'Orbit camera' },
  { value: 'pan', label: 'Pan camera' },
  { value: 'dollyZoom', label: 'Dolly zoom' },
  { value: 'none', label: 'No action' }
]

export const DEFAULT_CANVAS_NAVIGATION_PREFERENCES: CanvasNavigationPreferences = {
  dragBindings: {
    leftDrag: 'orbit',
    shiftLeftDrag: 'pan',
    middleDrag: 'none',
    shiftMiddleDrag: 'none',
    altLeftDrag: 'none',
    altMiddleDrag: 'none',
    altRightDrag: 'dollyZoom'
  }
}

export const CANVAS_NAVIGATION_PRESETS: Record<
  CanvasNavigationPresetId,
  CanvasNavigationPreferences
> = {
  intuitive: DEFAULT_CANVAS_NAVIGATION_PREFERENCES,
  cad: {
    dragBindings: {
      leftDrag: 'none',
      shiftLeftDrag: 'none',
      middleDrag: 'orbit',
      shiftMiddleDrag: 'pan',
      altLeftDrag: 'none',
      altMiddleDrag: 'none',
      altRightDrag: 'dollyZoom'
    }
  },
  blender: {
    dragBindings: {
      leftDrag: 'none',
      shiftLeftDrag: 'none',
      middleDrag: 'orbit',
      shiftMiddleDrag: 'pan',
      altLeftDrag: 'none',
      altMiddleDrag: 'dollyZoom',
      altRightDrag: 'none'
    }
  }
}

export const CANVAS_NAVIGATION_PRESET_OPTIONS: Option<CanvasNavigationPresetId>[] = [
  { value: 'intuitive', label: 'Intuitive' },
  { value: 'cad', label: 'CAD Software' },
  { value: 'blender', label: 'Blender Style' }
]

export const CANVAS_NAVIGATION_PREFERENCES_STORAGE_KEY =
  'perspective-check.canvasNavigationPreferences'
