import {
  type ResolvedTheme,
  THEME_STORAGE_KEY,
  type ThemePreference
} from '@/constants/theme'

export const isThemePreference = (value: unknown): value is ThemePreference =>
  value === 'system' || value === 'light' || value === 'dark'

export const getSystemTheme = (): ResolvedTheme =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'

export const getSystemThemeServerSnapshot = (): ResolvedTheme => 'light'

export const subscribeToSystemTheme = (onStoreChange: () => void) => {
  if (typeof window === 'undefined') {
    return () => undefined
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', onStoreChange)

  return () => {
    mediaQuery.removeEventListener('change', onStoreChange)
  }
}

export const getStoredThemePreference = (): ThemePreference => {
  if (typeof window === 'undefined') {
    return 'system'
  }

  const persistedThemePreference = window.localStorage.getItem(THEME_STORAGE_KEY)
  return isThemePreference(persistedThemePreference) ? persistedThemePreference : 'system'
}

export const persistThemePreference = (preference: ThemePreference) => {
  if (typeof window === 'undefined') {
    return
  }

  if (preference === 'system') {
    window.localStorage.removeItem(THEME_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(THEME_STORAGE_KEY, preference)
}

export const resolveTheme = (
  preference: ThemePreference,
  systemTheme: ResolvedTheme
): ResolvedTheme => (preference === 'system' ? systemTheme : preference)

export const applyResolvedTheme = (theme: ResolvedTheme) => {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}
