import { Keyboard, Mouse, Settings2, SlidersHorizontal } from 'lucide-react'

import { KeybindPreferencesPanel } from '@/components/keybind-preferences-panel'
import { type CanvasNavigationPreferences } from '@/constants/canvas-navigation'
import {
  THEME_PREFERENCE_OPTIONS,
  type ThemePreference
} from '@/constants/theme'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

type CanvasSettingsDialogProps = {
  preferences: CanvasNavigationPreferences
  onPreferencesChange: (nextPreferences: CanvasNavigationPreferences) => void
  themePreference: ThemePreference
  onThemePreferenceChange: (nextPreference: ThemePreference) => void
}

export function CanvasSettingsDialog({
  preferences,
  onPreferencesChange,
  themePreference,
  onThemePreferenceChange
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
              <Settings2 className="size-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Settings</TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Canvas Settings</DialogTitle>
          <DialogDescription>
            Configure navigation behavior and viewer preferences
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="keybinds" className="mt-1">
          <TabsList className="w-full justify-start">
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger
                  value="keybinds"
                  className="h-8 w-9 px-0"
                  aria-label="Keyboard and mouse keybinds"
                >
                  <span className="inline-flex items-center gap-1">
                    <Mouse className="size-3.5" />
                    <Keyboard className="size-3.5" />
                  </span>
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>keyboard and mouse keybinds</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger
                  value="viewer"
                  className="h-8 w-9 px-0"
                  aria-label="Viewer settings"
                >
                  <SlidersHorizontal className="size-4" />
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>Viewer settings</TooltipContent>
            </Tooltip>
          </TabsList>
          <TabsContent value="keybinds" className="mt-4">
            <div className="max-h-[60vh] overflow-y-auto pr-1">
              <KeybindPreferencesPanel
                preferences={preferences}
                onPreferencesChange={onPreferencesChange}
              />
            </div>
          </TabsContent>
          <TabsContent value="viewer" className="mt-4">
            <div className="space-y-4 rounded-md border p-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold">Appearance</h3>
                <p className="text-xs text-muted-foreground">
                  Theme defaults to system, and can be overridden here
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-center">
                <div className="text-sm font-medium">Theme source</div>
                <Select
                  value={themePreference}
                  onValueChange={(value) => onThemePreferenceChange(value as ThemePreference)}
                >
                  <SelectTrigger className="w-full sm:max-w-[220px]" aria-label="Theme source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {THEME_PREFERENCE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
