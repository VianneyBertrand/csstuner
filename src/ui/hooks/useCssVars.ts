import { useEffect, useState, useCallback } from 'react'
import { readAllCssVars, readDarkCssVars, hasDarkMode as detectDarkMode, isDarkModeActive } from '../../core/cssVarReader'
import { setCssVar, removeCssVar } from '../../core/cssVarWriter'
import { detectFramework } from '../../core/frameworkDetector'
import { groupVars } from '../../core/grouper'
import { loadPersistedVars, persistVars, clearPersistedVars, loadActiveMode, persistActiveMode } from '../../core/storage'
import type { CssVariable, CssTunerVar, Framework, VarGroup, ColorMode } from '../../core/types'

interface UseCssVarsOptions {
  customConfig?: Record<string, CssTunerVar>
  persist: boolean
}

interface UseCssVarsReturn {
  groups: VarGroup[]
  framework: Framework
  modifiedVars: Record<string, string>
  setVar: (name: string, value: string) => void
  resetVar: (name: string) => void
  resetAll: () => void
  originalVars: Record<string, string>
  activeMode: ColorMode
  hasDarkMode: boolean
  switchMode: (mode: ColorMode) => void
  lightModified: Record<string, string>
  darkModified: Record<string, string>
}

export function useCssVars({ customConfig, persist }: UseCssVarsOptions): UseCssVarsReturn {
  const [lightOriginals, setLightOriginals] = useState<Record<string, string>>({})
  const [darkOriginals, setDarkOriginals] = useState<Record<string, string>>({})
  const [lightModified, setLightModified] = useState<Record<string, string>>({})
  const [darkModified, setDarkModified] = useState<Record<string, string>>({})
  const [allVars, setAllVars] = useState<CssVariable[]>([])
  const [framework, setFramework] = useState<Framework>('unknown')
  const [activeMode, setActiveMode] = useState<ColorMode>('light')
  const [hasDark, setHasDark] = useState(false)

  // Lecture initiale
  useEffect(() => {
    const lightVars = readAllCssVars()
    const darkVars = readDarkCssVars()
    const darkModeExists = detectDarkMode()

    setHasDark(darkModeExists)
    setFramework(detectFramework(lightVars.map(v => v.name)))

    // Stocker les originaux
    const lightOrig: Record<string, string> = {}
    for (const v of lightVars) lightOrig[v.name] = v.value
    setLightOriginals(lightOrig)

    const darkOrig: Record<string, string> = {}
    for (const v of darkVars) darkOrig[v.name] = v.value
    setDarkOriginals(darkOrig)

    // Determiner le mode initial
    const initialMode = isDarkModeActive() ? 'dark' : (loadActiveMode() ?? 'light')
    setActiveMode(initialMode)

    // Restaurer les overrides persistes
    if (persist) {
      const lightPersisted = loadPersistedVars('light')
      const darkPersisted = loadPersistedVars('dark')

      if (lightPersisted) setLightModified(lightPersisted)
      if (darkPersisted) setDarkModified(darkPersisted)

      // Appliquer les overrides du mode actif
      const activePersisted = initialMode === 'light' ? lightPersisted : darkPersisted
      if (activePersisted) {
        for (const [name, value] of Object.entries(activePersisted)) {
          setCssVar(name, value)
        }
      }

      // Synchroniser la classe .dark avec le mode initial
      if (darkModeExists) {
        if (initialMode === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      }

      // Initialiser allVars avec le mode actif
      const activeVars = initialMode === 'light' ? lightVars : darkVars
      const activeOriginals = initialMode === 'light' ? lightOrig : darkOrig
      const activeMods = initialMode === 'light' ? lightPersisted : darkPersisted
      setAllVars(activeVars.map(v =>
        activeMods?.[v.name] ? { ...v, value: activeMods[v.name] } : v
      ))
    } else {
      setAllVars(lightVars)
    }
  }, [persist])

  // Observer les changements de classe .dark par le projet du user
  useEffect(() => {
    if (!hasDark) return

    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark')
      const detectedMode: ColorMode = isDark ? 'dark' : 'light'
      if (detectedMode !== activeMode) {
        // Le projet a change le mode — sync le panel sans re-toggle la classe
        const currentMods = activeMode === 'light' ? lightModified : darkModified
        for (const name of Object.keys(currentMods)) {
          removeCssVar(name)
        }

        const newMods = detectedMode === 'light' ? lightModified : darkModified
        for (const [name, value] of Object.entries(newMods)) {
          setCssVar(name, value)
        }

        const newOriginals = detectedMode === 'light' ? lightOriginals : darkOriginals
        const newVars = Object.entries(newOriginals).map(([name, value]) => ({
          name,
          value: newMods[name] ?? value,
        }))
        setAllVars(newVars)
        setActiveMode(detectedMode)
        if (persist) persistActiveMode(detectedMode)
      }
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => observer.disconnect()
  }, [hasDark, activeMode, lightModified, darkModified, lightOriginals, darkOriginals, persist])

  const switchMode = useCallback((newMode: ColorMode) => {
    if (newMode === activeMode) return

    // Retirer les overrides inline du mode actuel
    const currentMods = activeMode === 'light' ? lightModified : darkModified
    for (const name of Object.keys(currentMods)) {
      removeCssVar(name)
    }

    // Toggle la classe .dark
    if (newMode === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    // Appliquer les overrides du nouveau mode
    const newMods = newMode === 'light' ? lightModified : darkModified
    for (const [name, value] of Object.entries(newMods)) {
      setCssVar(name, value)
    }

    // Mettre a jour allVars avec les vars du nouveau mode
    const newOriginals = newMode === 'light' ? lightOriginals : darkOriginals
    const newVars = Object.entries(newOriginals).map(([name, value]) => ({
      name,
      value: newMods[name] ?? value,
    }))
    setAllVars(newVars)

    setActiveMode(newMode)
    if (persist) persistActiveMode(newMode)
  }, [activeMode, lightModified, darkModified, lightOriginals, darkOriginals, persist])

  const modifiedVars = activeMode === 'light' ? lightModified : darkModified
  const originalVars = activeMode === 'light' ? lightOriginals : darkOriginals

  const setVar = useCallback((name: string, value: string) => {
    setCssVar(name, value)

    const setMod = activeMode === 'light' ? setLightModified : setDarkModified
    setMod(prev => {
      const next = { ...prev, [name]: value }
      if (persist) persistVars(activeMode, next)
      return next
    })
    setAllVars(prev =>
      prev.map(v => v.name === name ? { ...v, value } : v)
    )
  }, [activeMode, persist])

  const resetVar = useCallback((name: string) => {
    removeCssVar(name)

    const setMod = activeMode === 'light' ? setLightModified : setDarkModified
    setMod(prev => {
      const next = { ...prev }
      delete next[name]
      if (persist) {
        if (Object.keys(next).length > 0) {
          persistVars(activeMode, next)
        } else {
          clearPersistedVars(activeMode)
        }
      }
      return next
    })
    setAllVars(prev =>
      prev.map(v => v.name === name ? { ...v, value: originalVars[name] ?? v.value } : v)
    )
  }, [activeMode, persist, originalVars])

  const resetAll = useCallback(() => {
    // Retirer les overrides inline du mode actuel
    for (const name of Object.keys(modifiedVars)) {
      removeCssVar(name)
    }
    // Reset les deux modes
    setLightModified({})
    setDarkModified({})
    if (persist) clearPersistedVars()
    // Restaurer allVars
    setAllVars(prev =>
      prev.map(v => ({ ...v, value: originalVars[v.name] ?? v.value }))
    )
  }, [modifiedVars, persist, originalVars])

  const groups = groupVars(allVars, framework, customConfig)

  return {
    groups, framework, modifiedVars, setVar, resetVar, resetAll, originalVars,
    activeMode, hasDarkMode: hasDark, switchMode,
    lightModified, darkModified,
  }
}
