export const APP_SHELL_CLASSES = {
  mainViewport: 'flex h-screen w-screen overflow-hidden bg-background',
  workspace: 'relative min-w-0 flex-1 overflow-hidden',
  canvas: 'h-full w-full',
  logoContainer: 'pointer-events-none absolute left-3 top-3 z-20',
  logoImage: 'h-14 w-14 object-contain drop-shadow-lg sm:h-20 sm:w-20',
  viewportToolbarContainer:
    'absolute left-1/2 top-16 z-30 -translate-x-1/2 sm:top-4',
  appearanceControlsContainer:
    'absolute right-3 top-3 z-30 flex items-center gap-1',
  loadingIndicatorContainer:
    'pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-4',
  loadingIndicatorPanel:
    'pointer-events-auto inline-flex items-center gap-3 rounded-xl border bg-card/92 px-4 py-3 text-sm text-foreground shadow-lg backdrop-blur',
  statusStackContainer:
    'pointer-events-none absolute bottom-10 left-1/2 z-20 flex w-full max-w-[calc(100%-2rem)] -translate-x-1/2 flex-col items-center sm:max-w-lg',
  statusCard:
    'pointer-events-none w-full rounded-md border bg-card/90 px-3 py-2 text-center text-xs shadow-md backdrop-blur',
  statusErrorCard: 'border-destructive/50 text-destructive',
  statusNoticeWrapper:
    'w-full overflow-hidden transition-[max-height,opacity,transform,margin] duration-300 ease-out',
  statusBar:
    'absolute inset-x-0 bottom-0 z-20 flex h-7 items-center gap-2 border-t bg-card/95 px-3 text-[11px] backdrop-blur'
} as const
