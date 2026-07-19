import { Settings } from 'lucide-react'

import { KeybindPreferencesPanel } from '@/components/keybind-preferences-panel'
import { type CanvasNavigationPreferences } from '@/constants/canvas-navigation'
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

type CanvasSettingsDialogProps = {
  preferences: CanvasNavigationPreferences
  onPreferencesChange: (nextPreferences: CanvasNavigationPreferences) => void
}

export function CanvasSettingsDialog({
  preferences,
  onPreferencesChange
}: CanvasSettingsDialogProps) {
  return (
    <Dialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Open settings"
              className="bg-background/95"
            >
              <Settings className="size-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Settings</TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editor preferences</DialogTitle>
          <DialogDescription>
            Configure the mouse controls used to navigate the viewport
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[65vh] overflow-y-auto pr-1">
          <KeybindPreferencesPanel
            preferences={preferences}
            onPreferencesChange={onPreferencesChange}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
