export type ClickInputId = 'leftClick' | 'middleClick' | 'rightClick'
export type DragInputId =
  | 'leftDrag'
  | 'shiftLeftDrag'
  | 'middleDrag'
  | 'shiftMiddleDrag'
  | 'altLeftDrag'
  | 'altMiddleDrag'
  | 'altRightDrag'

export type ClickBehaviorId = 'selectObject' | 'openContextMenu' | 'none'
export type DragBehaviorId = 'boxSelect' | 'orbit' | 'pan' | 'dollyZoom' | 'none'

export type CanvasNavigationPreferences = {
  clickBindings: Record<ClickInputId, ClickBehaviorId>
  dragBindings: Record<DragInputId, DragBehaviorId>
}

export type CanvasNavigationPresetId = 'intuitive' | 'cad' | 'blender'

type Option<TValue extends string> = {
  value: TValue
  label: string
}

export const CLICK_INPUT_OPTIONS: Option<ClickInputId>[] = [
  { value: 'leftClick', label: 'Left click' },
  { value: 'middleClick', label: 'Middle click' },
  { value: 'rightClick', label: 'Right click' }
]

export const DRAG_INPUT_OPTIONS: Option<DragInputId>[] = [
  { value: 'leftDrag', label: 'Left click drag' },
  { value: 'shiftLeftDrag', label: 'Shift + left click drag' },
  { value: 'middleDrag', label: 'Middle mouse drag' },
  { value: 'shiftMiddleDrag', label: 'Shift + middle mouse drag' },
  { value: 'altLeftDrag', label: 'Alt + left click drag' },
  { value: 'altMiddleDrag', label: 'Alt + middle mouse drag' },
  { value: 'altRightDrag', label: 'Alt + right click drag' }
]

export const CLICK_BEHAVIOR_OPTIONS: Option<ClickBehaviorId>[] = [
  { value: 'selectObject', label: 'Select object (no-op)' },
  { value: 'openContextMenu', label: 'Open context menu' },
  { value: 'none', label: 'No action' }
]

export const DRAG_BEHAVIOR_OPTIONS: Option<DragBehaviorId>[] = [
  { value: 'boxSelect', label: 'Box select' },
  { value: 'orbit', label: 'Orbit camera' },
  { value: 'pan', label: 'Pan camera' },
  { value: 'dollyZoom', label: 'Dolly zoom' },
  { value: 'none', label: 'No action' }
]

export const DEFAULT_CANVAS_NAVIGATION_PREFERENCES: CanvasNavigationPreferences = {
  clickBindings: {
    leftClick: 'selectObject',
    middleClick: 'none',
    rightClick: 'openContextMenu'
  },
  dragBindings: {
    leftDrag: 'orbit',
    shiftLeftDrag: 'pan',
    middleDrag: 'boxSelect',
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
    clickBindings: {
      leftClick: 'selectObject',
      middleClick: 'none',
      rightClick: 'openContextMenu'
    },
    dragBindings: {
      leftDrag: 'boxSelect',
      shiftLeftDrag: 'none',
      middleDrag: 'orbit',
      shiftMiddleDrag: 'pan',
      altLeftDrag: 'none',
      altMiddleDrag: 'none',
      altRightDrag: 'dollyZoom'
    }
  },
  blender: {
    clickBindings: {
      leftClick: 'selectObject',
      middleClick: 'none',
      rightClick: 'openContextMenu'
    },
    dragBindings: {
      leftDrag: 'boxSelect',
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

export const RESERVED_TRANSFORM_SHORTCUTS = [
  { input: 'Q / W / E / R', behavior: 'Reserved for select, move, rotate, scale tools (no-op)' },
  { input: 'X / Y / Z', behavior: 'Reserved for axis constraints (no-op)' },
  { input: 'Ctrl + Z / Ctrl + Shift + Z', behavior: 'Reserved for undo and redo (no-op)' },
  { input: 'F / A', behavior: 'Reserved for frame selected and frame all (no-op)' }
] as const
