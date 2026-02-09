import { Moon, Plus, Sun } from 'lucide-react'
import { type ChangeEvent, useEffect, useRef, useState, useSyncExternalStore } from 'react'

import logoPrimaryTransparent from '@/assets/logos/logo-primary-transparent.png'
import { CanvasSettingsDialog } from '@/components/canvas-settings-dialog'
import { KeybindHelpDialog } from '@/components/keybind-help-dialog'
import { PerspectiveProjectionCanvas } from '@/components/perspective-projection-canvas'
import {
  ACCEPTED_3D_FILE_EXTENSIONS,
  DEFAULT_CANVAS_NAVIGATION_PREFERENCES
} from '@/constants/canvas-navigation'
import { APP_SHELL_CLASSES } from '@/constants/app-shell'
import { type ThemePreference } from '@/constants/theme'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  applyResolvedTheme,
  getStoredThemePreference,
  getSystemTheme,
  getSystemThemeServerSnapshot,
  persistThemePreference,
  resolveTheme,
  subscribeToSystemTheme
} from '@/lib/theme-utils'

function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const [navigationPreferences, setNavigationPreferences] = useState(
    DEFAULT_CANVAS_NAVIGATION_PREFERENCES
  )
  const [themePreferenceState, setThemePreferenceState] = useState<ThemePreference>(getStoredThemePreference)
  const systemTheme = useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemTheme,
    getSystemThemeServerSnapshot
  )
  const setThemePreference = (nextPreference: ThemePreference) => {
    setThemePreferenceState(nextPreference)
    persistThemePreference(nextPreference)
  }
  const resolvedTheme = resolveTheme(themePreferenceState, systemTheme)

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setSelectedFileName(file?.name ?? null)
  }

  const handleThemeToggle = () => {
    setThemePreference(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  useEffect(() => {
    applyResolvedTheme(resolvedTheme)
  }, [resolvedTheme])

  return (
    <TooltipProvider>
      <main className={APP_SHELL_CLASSES.mainViewport}>
        <PerspectiveProjectionCanvas
          className={APP_SHELL_CLASSES.canvas}
          navigationPreferences={navigationPreferences}
          resolvedTheme={resolvedTheme}
        />

        <header className={APP_SHELL_CLASSES.logoContainer}>
          <img
            src={logoPrimaryTransparent}
            alt="PerspectiveCheck logo"
            className={APP_SHELL_CLASSES.logoImage}
          />
        </header>

        <div className={APP_SHELL_CLASSES.themeToggleContainer}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleThemeToggle}
                aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className={APP_SHELL_CLASSES.toolbarButton}
              >
                {resolvedTheme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            </TooltipContent>
          </Tooltip>
        </div>

        {selectedFileName ? (
          <div className={APP_SHELL_CLASSES.loadedFileBadge} role="status" aria-live="polite">
            Loaded file: {selectedFileName}
          </div>
        ) : null}

        <div className={APP_SHELL_CLASSES.toolbarContainer}>
          <div className={APP_SHELL_CLASSES.toolbarPanel}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Add 3D file"
                  className={APP_SHELL_CLASSES.toolbarButton}
                >
                  <Plus className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add 3D file</TooltipContent>
            </Tooltip>

            <CanvasSettingsDialog
              preferences={navigationPreferences}
              onPreferencesChange={setNavigationPreferences}
              themePreference={themePreferenceState}
              onThemePreferenceChange={setThemePreference}
            />
            <KeybindHelpDialog preferences={navigationPreferences} />
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_3D_FILE_EXTENSIONS}
          onChange={handleFileInputChange}
          className="hidden"
        />
      </main>
    </TooltipProvider>
  )
}

export default App
