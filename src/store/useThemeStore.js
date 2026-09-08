import { create } from 'zustand'

const STORAGE_KEY = 'flash-theme'

function systemTheme() {
  try {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function initialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'dark' || saved === 'light') return saved
  } catch { /* ignore */ }
  return systemTheme()
}

function apply(theme) {
  const dark = theme === 'dark'
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  try {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', dark ? '#0D0D12' : '#FFDE59')
  } catch { /* ignore */ }
}

export const useThemeStore = create((set) => ({
  theme: initialTheme(),

  // call once on boot (before paint via index.html guard + here for safety)
  init: () => {
    const t = initialTheme()
    apply(t)
    set({ theme: t })
  },

  setTheme: (theme) => {
    const t = theme === 'dark' ? 'dark' : 'light'
    try {
      localStorage.setItem(STORAGE_KEY, t)
    } catch { /* ignore */ }
    apply(t)
    set({ theme: t })
  },

  toggle: () => {
    const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark'
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch { /* ignore */ }
    apply(next)
    set({ theme: next })
  },
}))
