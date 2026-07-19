import {
  CANVAS_NAVIGATION_PRESET_OPTIONS,
  CANVAS_NAVIGATION_PRESETS,
  DRAG_BEHAVIOR_OPTIONS,
  DRAG_INPUT_OPTIONS,
  type CanvasNavigationPreferences,
  type CanvasNavigationPresetId,
  type DragBehaviorId,
  type DragInputId
} from '@/constants/canvas-navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

type KeybindPreferencesPanelProps = {
  preferences: CanvasNavigationPreferences
  onPreferencesChange: (nextPreferences: CanvasNavigationPreferences) => void
}

const UNASSIGNED_INPUT_VALUE = 'unassigned'
const CUSTOM_PRESET_VALUE = 'custom'

type ActionOption<TValue extends string> = {
  value: TValue
  label: string
}

type SelectInputValue<TInput extends string> = TInput | typeof UNASSIGNED_INPUT_VALUE

const DRAG_ACTION_OPTIONS = DRAG_BEHAVIOR_OPTIONS.filter(
  (option) => option.value !== 'none'
) as ActionOption<Exclude<DragBehaviorId, 'none'>>[]

const getSelectedInputForBehavior = <TInput extends string, TBehavior extends string>(
  bindings: Record<TInput, TBehavior>,
  options: ActionOption<TInput>[],
  behavior: TBehavior
): SelectInputValue<TInput> =>
  options.find((option) => bindings[option.value] === behavior)?.value ?? UNASSIGNED_INPUT_VALUE

const getBindingsWithAssignedInput = <TInput extends string, TBehavior extends string>(
  bindings: Record<TInput, TBehavior>,
  options: ActionOption<TInput>[],
  behavior: TBehavior,
  input: SelectInputValue<TInput>,
  emptyBehavior: TBehavior
) => {
  const nextBindings = options.reduce(
    (updatedBindings, option) => ({
      ...updatedBindings,
      [option.value]:
        updatedBindings[option.value] === behavior ? emptyBehavior : updatedBindings[option.value]
    }),
    { ...bindings }
  )

  if (input !== UNASSIGNED_INPUT_VALUE) {
    nextBindings[input] = behavior
  }

  return nextBindings
}

const arePreferencesEqual = (
  preferences: CanvasNavigationPreferences,
  preset: CanvasNavigationPreferences
) => {
  const dragBindingsMatch = DRAG_INPUT_OPTIONS.every(
    (option) => preferences.dragBindings[option.value] === preset.dragBindings[option.value]
  )

  return dragBindingsMatch
}

const getActivePresetValue = (preferences: CanvasNavigationPreferences) =>
  CANVAS_NAVIGATION_PRESET_OPTIONS.find((option) =>
    arePreferencesEqual(preferences, CANVAS_NAVIGATION_PRESETS[option.value])
  )?.value ?? CUSTOM_PRESET_VALUE

export function KeybindPreferencesPanel({
  preferences,
  onPreferencesChange
}: KeybindPreferencesPanelProps) {
  const activePreset = getActivePresetValue(preferences)
  const updateDragBinding = (
    behavior: Exclude<DragBehaviorId, 'none'>,
    input: SelectInputValue<DragInputId>
  ) => {
    onPreferencesChange({
      ...preferences,
      dragBindings: getBindingsWithAssignedInput(
        preferences.dragBindings,
        DRAG_INPUT_OPTIONS,
        behavior,
        input,
        'none'
      )
    })
  }

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Preset</h3>
        <Select
          value={activePreset}
          onValueChange={(value) =>
            onPreferencesChange(CANVAS_NAVIGATION_PRESETS[value as CanvasNavigationPresetId])
          }
        >
          <SelectTrigger className="w-full sm:max-w-[260px]" aria-label="Keybind preset">
            <SelectValue>{activePreset === CUSTOM_PRESET_VALUE ? 'Custom' : undefined}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {CANVAS_NAVIGATION_PRESET_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>
      <section>
        <h3 className="text-sm font-semibold">Drag Actions</h3>
        <div className="mt-2 space-y-2">
          {DRAG_ACTION_OPTIONS.map((behaviorOption) => (
            <div
              key={behaviorOption.value}
              className="grid gap-2 rounded-md border p-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center"
            >
              <div className="text-sm font-medium">{behaviorOption.label}</div>
              <Select
                value={getSelectedInputForBehavior(
                  preferences.dragBindings,
                  DRAG_INPUT_OPTIONS,
                  behaviorOption.value
                )}
                onValueChange={(value) =>
                  updateDragBinding(
                    behaviorOption.value,
                    value as SelectInputValue<DragInputId>
                  )
                }
              >
                <SelectTrigger className="w-full" aria-label={`${behaviorOption.label} input`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED_INPUT_VALUE}>Not assigned</SelectItem>
                  {DRAG_INPUT_OPTIONS.map((inputOption) => (
                    <SelectItem key={inputOption.value} value={inputOption.value}>
                      {inputOption.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
