import { Monitor, Moon, Sun } from 'lucide-react'

import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import {
  THEME_PREFERENCE_OPTIONS,
  type ThemePreference
} from '@/constants/theme'

type ThemeSelectorProps = {
  value: ThemePreference
  onChange: (value: ThemePreference) => void
}

const ThemeIcon = ({ preference }: { preference: ThemePreference }) => {
  if (preference === 'light') {
    return <Sun className="size-4" />
  }
  if (preference === 'dark') {
    return <Moon className="size-4" />
  }
  return <Monitor className="size-4" />
}

export function ThemeSelector({ value, onChange }: ThemeSelectorProps) {
  const activeLabel = THEME_PREFERENCE_OPTIONS.find((option) => option.value === value)?.label

  return (
    <Select value={value} onValueChange={(nextValue) => onChange(nextValue as ThemePreference)}>
      <SelectTrigger
        className="h-9 w-9 justify-center bg-background/95 px-0 [&>svg:last-child]:hidden"
        aria-label={`Viewport theme: ${activeLabel}`}
        title={`Viewport theme: ${activeLabel}`}
      >
        <ThemeIcon preference={value} />
      </SelectTrigger>
      <SelectContent align="end">
        {THEME_PREFERENCE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
