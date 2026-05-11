import { Moon, Plus, Sun } from 'lucide-react'
import { type ChangeEvent, useEffect, useRef, useState, useSyncExternalStore } from 'react'

import logoPrimaryTransparent from '@/assets/logos/logo-primary-transparent.png'
import { CanvasSettingsDialog } from '@/components/canvas-settings-dialog'
import { KeybindHelpDialog } from '@/components/keybind-help-dialog'
import { PerspectiveProjectionCanvas } from '@/components/perspective-projection-canvas'
import {
  ACCEPTED_3D_FILE_EXTENSIONS,
  type CanvasNavigationPreferences
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
import {
  getStoredCanvasNavigationPreferences,
  persistCanvasNavigationPreferences
} from '@/lib/keybind-utils'
import { loadProjectionModelFromFile } from '@/lib/model-pipelines/load-model-file'
import {
  clearLastProjectionModelFile,
  getLastProjectionModelFile,
  persistLastProjectionModelFile
} from '@/lib/model-pipelines/persisted-model-file'
import { type ProjectionModel } from '@/lib/model-pipelines/projection-model'

function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const [fileLoadError, setFileLoadError] = useState<string | null>(null)
  const [projectionModel, setProjectionModel] = useState<ProjectionModel | null>(null)
  const [navigationPreferences, setNavigationPreferencesState] = useState(
    getStoredCanvasNavigationPreferences
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
  const setNavigationPreferences = (nextPreferences: CanvasNavigationPreferences) => {
    setNavigationPreferencesState(nextPreferences)
    persistCanvasNavigationPreferences(nextPreferences)
  }
  const resolvedTheme = resolveTheme(themePreferenceState, systemTheme)

  const handleFileInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    try {
      const nextModel = await loadProjectionModelFromFile(file)
      setProjectionModel(nextModel)
      setSelectedFileName(file.name)
      setFileLoadError(null)

      try {
        await persistLastProjectionModelFile(file)
      } catch {
        return
      }
    } catch (error) {
      setProjectionModel(null)
      setSelectedFileName(null)
      setFileLoadError(error instanceof Error ? error.message : 'Unable to load this 3D file')
    }
  }

  const handleThemeToggle = () => {
    setThemePreference(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  useEffect(() => {
    applyResolvedTheme(resolvedTheme)
  }, [resolvedTheme])

  useEffect(() => {
    let isMounted = true

    const restoreLastLoadedFile = async () => {
      try {
        const file = await getLastProjectionModelFile()
        if (!file || !isMounted) {
          return
        }

        const nextModel = await loadProjectionModelFromFile(file)
        if (!isMounted) {
          return
        }

        setProjectionModel(nextModel)
        setSelectedFileName(file.name)
        setFileLoadError(null)
      } catch {
        try {
          await clearLastProjectionModelFile()
        } catch {
          return
        }

        if (isMounted) {
          setProjectionModel(null)
          setSelectedFileName(null)
          setFileLoadError('Last saved file could not be loaded. Add the OBJ file again.')
        }
      }
    }

    void restoreLastLoadedFile()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <TooltipProvider>
      <main className={APP_SHELL_CLASSES.mainViewport}>
        <PerspectiveProjectionCanvas
          className={APP_SHELL_CLASSES.canvas}
          navigationPreferences={navigationPreferences}
          projectionModel={projectionModel}
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
            {projectionModel ? (
              <span className="ml-2">
                {projectionModel.vertices.length} vertices, {projectionModel.edges.length} edges
              </span>
            ) : null}
          </div>
        ) : null}

        {fileLoadError ? (
          <div
            className={`${APP_SHELL_CLASSES.loadedFileBadge} border-destructive/50 text-destructive`}
            role="alert"
          >
            {fileLoadError}
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
