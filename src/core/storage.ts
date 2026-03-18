const STORAGE_KEY = 'csstuner:overrides'

/**
 * Charge les overrides persistes depuis localStorage
 */
export function loadPersistedVars(): Record<string, string> | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Record<string, string>
  } catch {
    return null
  }
}

/**
 * Persiste les overrides dans localStorage
 */
export function persistVars(vars: Record<string, string>): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vars))
  } catch {
    // localStorage plein ou indisponible
  }
}

/**
 * Supprime les overrides persistes
 */
export function clearPersistedVars(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore
  }
}
