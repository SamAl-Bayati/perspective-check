type KeyboardShortcutEvent = {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
}

export const supportsTransformShortcut = (event: KeyboardShortcutEvent) => {
  const key = event.key.toLowerCase()
  const isUndo = (event.ctrlKey || event.metaKey) && key === 'z'
  const isRedo = (event.ctrlKey || event.metaKey) && event.shiftKey && key === 'z'

  if (isUndo || isRedo) {
    return true
  }

  return ['q', 'w', 'e', 'r', 'x', 'y', 'z', 'f', 'a'].includes(key)
}

export const getOptionLabel = <TOption extends { value: string, label: string }>(
  options: TOption[],
  value: string
) => options.find((option) => option.value === value)?.label ?? value
