import { CircleAlert, Moon, Plus, Sun, X } from 'lucide-react'
import {
  type PointerEvent as ReactPointerEvent,
  startTransition,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore
} from 'react'
import { flushSync } from 'react-dom'

import logoPrimaryTransparent from '@/assets/logos/logo-primary-transparent.png'
import { CanvasSettingsDialog } from '@/components/canvas-settings-dialog'
import { KeybindHelpDialog } from '@/components/keybind-help-dialog'
import { ModelImportDialog } from '@/components/model-import-dialog'
import { PerspectiveProjectionCanvas } from '@/components/perspective-projection-canvas'
import { type CanvasNavigationPreferences } from '@/constants/canvas-navigation'
import { APP_SHELL_CLASSES } from '@/constants/app-shell'
import { type ThemePreference } from '@/constants/theme'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
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
import { type ProjectionModelFileBundle } from '@/lib/model-pipelines/projection-model-file-bundle'
import { type ProjectionModel } from '@/lib/model-pipelines/projection-model'

type ModelLoadSource = 'manual' | 'restore'
type ModelLoadResult = 'loaded' | 'failed' | 'ignored'
type ModelLoadState = {
  id: number
  message: string
  source: ModelLoadSource
  phase: 'loading' | 'canceling'
}
type ModelViewState = {
  selectedFileName: string | null
  projectionModel: ProjectionModel | null
}
type StatusNotice = {
  id: number
  message: string
  phase: 'visible' | 'exiting'
}
type ActiveModelLoad = {
  id: number
  source: ModelLoadSource
  previousState: ModelViewState
  abortController: AbortController
}
type LoadProjectionModelFn = (
  fileBundle: ProjectionModelFileBundle,
  options: {
    loadingMessage: string
    source: ModelLoadSource
    persistLoadedFile?: boolean
    getErrorMessage?: (error: unknown) => string
  }
) => Promise<ModelLoadResult>

function App() {
  const isMountedRef = useRef(true)
  const activeModelLoadIdRef = useRef(0)
  const activeModelLoadRef = useRef<ActiveModelLoad | null>(null)
  const cancelingStateTimeoutRef = useRef<number | null>(null)
  const statusNoticeIdRef = useRef(0)
  const statusNoticeTimersRef = useRef(new Map<number, { dismissTimer: number, removeTimer: number | null }>())
  const transientStatusStackRef = useRef<HTMLDivElement | null>(null)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const [modelLoadState, setModelLoadState] = useState<ModelLoadState | null>(null)
  const [projectionModel, setProjectionModel] = useState<ProjectionModel | null>(null)
  const [statusNotices, setStatusNotices] = useState<StatusNotice[]>([])
  const [transientStatusStackHeight, setTransientStatusStackHeight] = useState(0)
  const [isModelImportDialogOpen, setIsModelImportDialogOpen] = useState(false)
  const currentModelViewStateRef = useRef<ModelViewState>({
    selectedFileName: null,
    projectionModel: null
  })
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
  const isModelLoading = modelLoadState?.phase === 'loading'
  const isRestoreLoading =
    modelLoadState?.source === 'restore' && modelLoadState.phase === 'loading'
  currentModelViewStateRef.current = {
    selectedFileName,
    projectionModel
  }

  const restoreModelViewState = (state: ModelViewState) => {
    setProjectionModel(state.projectionModel)
    setSelectedFileName(state.selectedFileName)
  }

  const clearStatusNoticeTimers = (noticeId: number) => {
    const timers = statusNoticeTimersRef.current.get(noticeId)
    if (!timers) {
      return
    }

    window.clearTimeout(timers.dismissTimer)
    if (timers.removeTimer !== null) {
      window.clearTimeout(timers.removeTimer)
    }
    statusNoticeTimersRef.current.delete(noticeId)
  }

  const removeStatusNotice = (noticeId: number) => {
    clearStatusNoticeTimers(noticeId)
    setStatusNotices((currentNotices) =>
      currentNotices.filter((notice) => notice.id !== noticeId)
    )
  }

  const dismissStatusNotice = (noticeId: number) => {
    const timers = statusNoticeTimersRef.current.get(noticeId)
    if (!timers) {
      return
    }

    setStatusNotices((currentNotices) =>
      currentNotices.map((notice) =>
        notice.id === noticeId
          ? { ...notice, phase: 'exiting' }
          : notice
      )
    )

    if (timers.removeTimer !== null) {
      return
    }

    timers.removeTimer = window.setTimeout(() => {
      removeStatusNotice(noticeId)
    }, 300)
  }

  const pushStatusNotice = (message: string) => {
    const noticeId = statusNoticeIdRef.current + 1
    statusNoticeIdRef.current = noticeId
    setStatusNotices((currentNotices) => [
      {
        id: noticeId,
        message,
        phase: 'visible'
      },
      ...currentNotices
    ])

    statusNoticeTimersRef.current.set(noticeId, {
      dismissTimer: window.setTimeout(() => {
        dismissStatusNotice(noticeId)
      }, 5000),
      removeTimer: null
    })
  }

  const loadProjectionModel = async (
    fileBundle: ProjectionModelFileBundle,
    {
      loadingMessage,
      source,
      persistLoadedFile = false,
      getErrorMessage
    }: {
      loadingMessage: string
      source: ModelLoadSource
      persistLoadedFile?: boolean
      getErrorMessage?: (error: unknown) => string
    }
  ): Promise<ModelLoadResult> => {
    const previousState = currentModelViewStateRef.current
    const loadId = activeModelLoadIdRef.current + 1
    const abortController = new AbortController()
    activeModelLoadIdRef.current = loadId
    activeModelLoadRef.current = {
      id: loadId,
      source,
      previousState,
      abortController
    }
    if (cancelingStateTimeoutRef.current !== null) {
      window.clearTimeout(cancelingStateTimeoutRef.current)
      cancelingStateTimeoutRef.current = null
    }
    setModelLoadState({
      id: loadId,
      message: loadingMessage,
      source,
      phase: 'loading'
    })

    try {
      const nextModel = await loadProjectionModelFromFile(fileBundle, abortController.signal)
      if (!isMountedRef.current || activeModelLoadIdRef.current !== loadId) {
        return 'ignored'
      }

      setProjectionModel(nextModel)
      setSelectedFileName(fileBundle.entryFile.name)

      if (!persistLoadedFile) {
        return 'loaded'
      }

      try {
        await persistLastProjectionModelFile(fileBundle)
      } catch {
        return 'loaded'
      }

      return 'loaded'
    } catch (error) {
      if (!isMountedRef.current || activeModelLoadIdRef.current !== loadId) {
        return 'ignored'
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'ignored'
      }

      restoreModelViewState(previousState)
      pushStatusNotice(
        getErrorMessage?.(error) ?? (error instanceof Error ? error.message : 'Unable to load this 3D file')
      )

      return 'failed'
    } finally {
      if (isMountedRef.current && activeModelLoadIdRef.current === loadId) {
        activeModelLoadRef.current = null
        setModelLoadState(null)
      }
    }
  }
  const loadProjectionModelRef = useRef<LoadProjectionModelFn>(loadProjectionModel)
  loadProjectionModelRef.current = loadProjectionModel

  const cancelRestoreLoad = () => {
    const activeLoad = activeModelLoadRef.current
    if (!activeLoad || activeLoad.source !== 'restore') {
      return
    }

    activeModelLoadIdRef.current += 1
    activeModelLoadRef.current = null
    activeLoad.abortController.abort()
    if (cancelingStateTimeoutRef.current !== null) {
      window.clearTimeout(cancelingStateTimeoutRef.current)
      cancelingStateTimeoutRef.current = null
    }
    flushSync(() => {
      setModelLoadState({
        id: activeLoad.id,
        message: 'Canceling...',
        source: 'restore',
        phase: 'canceling'
      })
    })
    startTransition(() => {
      restoreModelViewState(activeLoad.previousState)
    })
    cancelingStateTimeoutRef.current = window.setTimeout(() => {
      if (!isMountedRef.current) {
        return
      }

      setModelLoadState((currentState) =>
        currentState?.id === activeLoad.id && currentState.phase === 'canceling'
          ? null
          : currentState
      )
      cancelingStateTimeoutRef.current = null
    }, 300)
  }

  const handleRestoreCancelPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    cancelRestoreLoad()
  }

  const handleModelImport = async (fileBundle: ProjectionModelFileBundle) => {
    await loadProjectionModel(fileBundle, {
      loadingMessage: `Loading ${fileBundle.entryFile.name}...`,
      source: 'manual',
      persistLoadedFile: true
    })
  }

  const handleThemeToggle = () => {
    setThemePreference(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  useEffect(() => {
    applyResolvedTheme(resolvedTheme)
  }, [resolvedTheme])

  useEffect(() => {
    const transientStatusStack = transientStatusStackRef.current
    if (!transientStatusStack || typeof ResizeObserver === 'undefined') {
      return undefined
    }

    const resizeObserver = new ResizeObserver(([entry]) => {
      setTransientStatusStackHeight(entry?.contentRect.height ?? 0)
    })
    resizeObserver.observe(transientStatusStack)
    setTransientStatusStackHeight(transientStatusStack.getBoundingClientRect().height)

    return () => {
      resizeObserver.disconnect()
    }
  }, [statusNotices])

  useEffect(() => {
    isMountedRef.current = true
    const statusNoticeTimers = statusNoticeTimersRef.current

    const clearStoredModelFile = async () => {
      try {
        await clearLastProjectionModelFile()
      } catch {
        return
      }
    }

    const restoreLastLoadedFile = async () => {
      const fileBundle = await getLastProjectionModelFile()
      if (!fileBundle || !isMountedRef.current) {
        return
      }

      const restored = await loadProjectionModelRef.current(fileBundle, {
        loadingMessage: `Restoring ${fileBundle.entryFile.name}...`,
        source: 'restore',
        getErrorMessage: () => 'Last saved file could not be loaded. Add the model file again.'
      })
      if (restored !== 'failed') {
        return
      }

      try {
        await clearLastProjectionModelFile()
      } catch {
        return
      }
    }

    void restoreLastLoadedFile().catch(() => {
      void clearStoredModelFile()
    })

    return () => {
      activeModelLoadRef.current?.abortController.abort()
      activeModelLoadRef.current = null
      isMountedRef.current = false
      if (cancelingStateTimeoutRef.current !== null) {
        window.clearTimeout(cancelingStateTimeoutRef.current)
      }
      statusNoticeTimers.forEach((timers, noticeId) => {
        clearStatusNoticeTimers(noticeId)
      })
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

        {modelLoadState ? (
          <div
            className={APP_SHELL_CLASSES.loadingIndicatorContainer}
            role="status"
            aria-live="polite"
            aria-busy={modelLoadState.phase === 'loading'}
          >
            <div className={APP_SHELL_CLASSES.loadingIndicatorPanel}>
              <Spinner className="size-5 text-primary" />
              <span>{modelLoadState.message}</span>
              {isRestoreLoading ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onPointerDown={handleRestoreCancelPointerDown}
                  onClick={cancelRestoreLoad}
                  aria-label="Cancel restoring saved model"
                  className="bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive"
                >
                  <X className="size-4" />
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

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

        {selectedFileName || statusNotices.length > 0 ? (
          <div className={APP_SHELL_CLASSES.statusStackContainer}>
            {selectedFileName ? (
              <div
                className={APP_SHELL_CLASSES.statusPersistentWrapper}
                style={{ marginBottom: transientStatusStackHeight }}
              >
                <Card
                  className={cn(
                    APP_SHELL_CLASSES.statusCard,
                    APP_SHELL_CLASSES.statusPersistentCard
                  )}
                  role="status"
                  aria-live="polite"
                >
                  Loaded file: {selectedFileName}
                  {projectionModel ? (
                    <span className="ml-2">
                      {projectionModel.vertices.length} vertices, {projectionModel.edges.length} edges
                    </span>
                  ) : null}
                </Card>
              </div>
            ) : null}

            <div
              ref={transientStatusStackRef}
              className={APP_SHELL_CLASSES.statusTransientStack}
              aria-live="assertive"
            >
              {statusNotices.map((notice) => (
                <div
                  key={notice.id}
                  className={cn(
                    APP_SHELL_CLASSES.statusNoticeWrapper,
                    notice.phase === 'visible'
                      ? 'mt-2 max-h-24 opacity-100 translate-y-0'
                      : 'mt-0 max-h-0 opacity-0 translate-y-2'
                  )}
                >
                  <Card
                    className={cn(
                      APP_SHELL_CLASSES.statusCard,
                      APP_SHELL_CLASSES.statusErrorCard,
                      notice.phase === 'visible' ? 'animate-in fade-in-0 slide-in-from-bottom-2 duration-300' : ''
                    )}
                    role="alert"
                  >
                    <span className="inline-flex items-center gap-2">
                      <CircleAlert className="size-4 shrink-0" />
                      <span>{notice.message}</span>
                    </span>
                  </Card>
                </div>
              ))}
            </div>
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
                  onClick={() => setIsModelImportDialogOpen(true)}
                  aria-label={isModelLoading ? 'Loading 3D file' : 'Add 3D file'}
                  className={APP_SHELL_CLASSES.toolbarButton}
                  disabled={isModelLoading}
                >
                  {isModelLoading ? <Spinner className="size-4" /> : <Plus className="size-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isModelLoading ? 'Loading model' : 'Add 3D file'}</TooltipContent>
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

        <ModelImportDialog
          open={isModelImportDialogOpen}
          onOpenChange={setIsModelImportDialogOpen}
          onError={pushStatusNotice}
          onImport={handleModelImport}
          disabled={isModelLoading}
        />
      </main>
    </TooltipProvider>
  )
}

export default App
