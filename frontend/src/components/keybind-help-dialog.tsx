import { CircleHelp } from 'lucide-react'

import {
  DRAG_BEHAVIOR_OPTIONS,
  DRAG_INPUT_OPTIONS,
  type CanvasNavigationPreferences
} from '@/constants/canvas-navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getOptionLabel } from '@/lib/keybind-utils'

type KeybindHelpDialogProps = {
  preferences: CanvasNavigationPreferences
}

export function KeybindHelpDialog({ preferences }: KeybindHelpDialogProps) {
  const mouseKeybindRows = [
    ...DRAG_INPUT_OPTIONS.map((option) => ({
      input: option.label,
      behavior: getOptionLabel(DRAG_BEHAVIOR_OPTIONS, preferences.dragBindings[option.value])
    })),
    { input: 'Mouse wheel', behavior: 'Zoom in and out' }
  ]

  return (
    <Dialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Open help"
              className="bg-background/95"
            >
              <CircleHelp className="size-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Help and controls</TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Canvas Controls</DialogTitle>
          <DialogDescription>
            Reference for the current mouse and keyboard interaction mappings
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[65vh] space-y-6 overflow-y-auto pr-1">
          <section>
            <h3 className="text-sm font-semibold">Current Mouse Bindings</h3>
            <div className="mt-2 overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left font-medium">Input</th>
                    <th scope="col" className="px-3 py-2 text-left font-medium">Behavior</th>
                  </tr>
                </thead>
                <tbody>
                  {mouseKeybindRows.map((binding) => (
                    <tr key={binding.input} className="border-t">
                      <td className="px-3 py-2 font-mono text-xs">{binding.input}</td>
                      <td className="px-3 py-2">{binding.behavior}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
