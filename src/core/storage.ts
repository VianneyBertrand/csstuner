import type { ColorMode } from './types'

const OLD_KEY = 'csstuner:overrides'
const MODE_KEY = 'csstuner:activeMode'

function storageKey(mode: ColorMode): string {
  return `csstuner:${mode}`
}

/**
 * Migration one-time: deplace l'ancien format vers le nouveau.
 */
function migrateIfNeeded(): void {
  if (typeof window === 'undefined') return
  try {
    const old = localStorage.getItem(OLD_KEY)
    if (old) {
      localStorage.setItem(storageKey('light'), old)
      localStorage.removeItem(OLD_KEY)
    }
  } catch {
    // Ignore
  }
}

// Lancer la migration au chargement du module
migrateIfNeeded()

/**
 * Charge les overrides persistes pour un mode donne.
 */
export function loadPersistedVars(mode: ColorMode = 'light'): Record<string, string> | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem(storageKey(mode))
    if (!raw) return null
    return JSON.parse(raw) as Record<string, string>
  } catch {
    return null
  }
}

/**
 * Persiste les overrides pour un mode donne.
 */
export function persistVars(mode: ColorMode, vars: Record<string, string>): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(storageKey(mode), JSON.stringify(vars))
  } catch {
    // localStorage plein ou indisponible
  }
}

/**
 * Supprime les overrides persistes. Sans argument, supprime les deux modes.
 */
export function clearPersistedVars(mode?: ColorMode): void {
  if (typeof window === 'undefined') return

  try {
    if (mode) {
      localStorage.removeItem(storageKey(mode))
    } else {
      localStorage.removeItem(storageKey('light'))
      localStorage.removeItem(storageKey('dark'))
    }
  } catch {
    // Ignore
  }
}

/**
 * Persiste le mode actif.
 */
export function persistActiveMode(mode: ColorMode): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(MODE_KEY, mode)
  } catch {
    // Ignore
  }
}

/**
 * Charge le mode actif persiste.
 */
export function loadActiveMode(): ColorMode | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(MODE_KEY)
    if (raw === 'light' || raw === 'dark') return raw
    return null
  } catch {
    return null
  }
}
