export const APP_SHELL_CLASSES = {
  mainViewport: 'relative h-screen w-screen overflow-hidden bg-background',
  canvas: 'h-full w-full',
  logoContainer: 'pointer-events-none absolute left-4 top-4 z-20',
  logoImage: 'h-40 w-40 object-contain drop-shadow-xl',
  themeToggleContainer: 'absolute right-4 top-4 z-30',
  loadedFileBadge:
    'pointer-events-none absolute left-4 top-20 z-20 max-w-[calc(100vw-2rem)] rounded-md border bg-card/90 px-3 py-2 text-xs text-muted-foreground shadow-md backdrop-blur',
  toolbarContainer: 'absolute bottom-6 left-1/2 z-30 -translate-x-1/2',
  toolbarPanel:
    'flex origin-bottom scale-150 items-center gap-2 rounded-2xl border bg-card/95 p-2 shadow-lg backdrop-blur',
  toolbarButton: 'bg-background/95'
} as const
