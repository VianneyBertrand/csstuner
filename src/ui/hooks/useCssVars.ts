import { useEffect, useState, useCallback } from 'react'
import { readAllCssVars } from '../../core/cssVarReader'
import { setCssVar, removeCssVar } from '../../core/cssVarWriter'
import { detectFramework } from '../../core/frameworkDetector'
import { groupVars } from '../../core/grouper'
import { loadPersistedVars, persistVars, clearPersistedVars } from '../../core/storage'
import type { CssVariable, CssTunerVar, Framework, VarGroup } from '../../core/types'

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
}

export function useCssVars({ customConfig, persist }: UseCssVarsOptions): UseCssVarsReturn {
  const [originalVars, setOriginalVars] = useState<Record<string, string>>({})
  const [modifiedVars, setModifiedVars] = useState<Record<string, string>>({})
  const [allVars, setAllVars] = useState<CssVariable[]>([])
  const [framework, setFramework] = useState<Framework>('unknown')

  // Lecture initiale + restauration des overrides persistes
  useEffect(() => {
    const vars = readAllCssVars()
    setAllVars(vars)

    const originals: Record<string, string> = {}
    for (const v of vars) {
      originals[v.name] = v.value
    }
    setOriginalVars(originals)

    setFramework(detectFramework(vars.map(v => v.name)))

    // Restaurer les overrides persistes
    if (persist) {
      const persisted = loadPersistedVars()
      if (persisted) {
        for (const [name, value] of Object.entries(persisted)) {
          setCssVar(name, value)
        }
        setModifiedVars(persisted)
      }
    }
  }, [persist])

  const setVar = useCallback((name: string, value: string) => {
    setCssVar(name, value)
    setModifiedVars(prev => {
      const next = { ...prev, [name]: value }
      if (persist) persistVars(next)
      return next
    })
    // Mettre a jour allVars pour rafraichir le groupement
    setAllVars(prev =>
      prev.map(v => v.name === name ? { ...v, value } : v)
    )
  }, [persist])

  const resetVar = useCallback((name: string) => {
    removeCssVar(name)
    setModifiedVars(prev => {
      const next = { ...prev }
      delete next[name]
      if (persist) {
        if (Object.keys(next).length > 0) {
          persistVars(next)
        } else {
          clearPersistedVars()
        }
      }
      return next
    })
    // Restaurer la valeur originale dans allVars
    setAllVars(prev =>
      prev.map(v => v.name === name ? { ...v, value: originalVars[name] ?? v.value } : v)
    )
  }, [persist, originalVars])

  const resetAll = useCallback(() => {
    for (const name of Object.keys(modifiedVars)) {
      removeCssVar(name)
    }
    setModifiedVars({})
    if (persist) clearPersistedVars()
    // Restaurer toutes les valeurs originales
    setAllVars(prev =>
      prev.map(v => ({ ...v, value: originalVars[v.name] ?? v.value }))
    )
  }, [modifiedVars, persist, originalVars])

  const groups = groupVars(allVars, framework, customConfig)

  return { groups, framework, modifiedVars, setVar, resetVar, resetAll, originalVars }
}
