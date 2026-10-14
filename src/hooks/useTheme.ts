import { useEffect, useState } from 'react'
import { useEditorStore } from '@/store/editorStore'
import type { ThemeMode } from '@/types/board'

function systemTheme(): ThemeMode {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** The theme currently in effect, after resolving the "system" preference. */
export function useResolvedTheme(): ThemeMode {
  const preference = useEditorStore((s) => s.theme)
  const [system, setSystem] = useState<ThemeMode>(systemTheme)

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystem(query.matches ? 'dark' : 'light')
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return preference === 'system' ? system : preference
}

/** Mirrors the resolved theme onto the document root. Mount once near the app root. */
export function useThemeEffect(): ThemeMode {
  const theme = useResolvedTheme()
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.style.colorScheme = theme
  }, [theme])
  return theme
}
