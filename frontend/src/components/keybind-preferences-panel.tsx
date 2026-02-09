import {
  CLICK_BEHAVIOR_OPTIONS,
  CLICK_INPUT_OPTIONS,
  DRAG_BEHAVIOR_OPTIONS,
  DRAG_INPUT_OPTIONS,
  type CanvasNavigationPreferences,
  type ClickBehaviorId,
  type DragBehaviorId
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

export function KeybindPreferencesPanel({
  preferences,
  onPreferencesChange
}: KeybindPreferencesPanelProps) {
  return (
    <div className="space-y-5">
      <section>
        <h3 className="text-sm font-semibold">Click Preferences</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Click inputs can only map to click behaviors
        </p>
        <div className="mt-2 space-y-2">
          {CLICK_INPUT_OPTIONS.map((inputOption) => (
            <div
              key={inputOption.value}
              className="grid gap-2 rounded-md border p-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center"
            >
              <div className="text-sm font-medium">{inputOption.label}</div>
              <Select
                value={preferences.clickBindings[inputOption.value]}
                onValueChange={(value) =>
                  onPreferencesChange({
                    ...preferences,
                    clickBindings: {
                      ...preferences.clickBindings,
                      [inputOption.value]: value as ClickBehaviorId
                    }
                  })
                }
              >
                <SelectTrigger className="w-full" aria-label={`${inputOption.label} click behavior`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLICK_BEHAVIOR_OPTIONS.map((behaviorOption) => (
                    <SelectItem key={behaviorOption.value} value={behaviorOption.value}>
                      {behaviorOption.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h3 className="text-sm font-semibold">Drag Preferences</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Drag inputs can only map to drag behaviors
        </p>
        <div className="mt-2 space-y-2">
          {DRAG_INPUT_OPTIONS.map((inputOption) => (
            <div
              key={inputOption.value}
              className="grid gap-2 rounded-md border p-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center"
            >
              <div className="text-sm font-medium">{inputOption.label}</div>
              <Select
                value={preferences.dragBindings[inputOption.value]}
                onValueChange={(value) =>
                  onPreferencesChange({
                    ...preferences,
                    dragBindings: {
                      ...preferences.dragBindings,
                      [inputOption.value]: value as DragBehaviorId
                    }
                  })
                }
              >
                <SelectTrigger className="w-full" aria-label={`${inputOption.label} drag behavior`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DRAG_BEHAVIOR_OPTIONS.map((behaviorOption) => (
                    <SelectItem key={behaviorOption.value} value={behaviorOption.value}>
                      {behaviorOption.label}
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
