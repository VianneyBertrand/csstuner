'use client'

import { useState, useEffect } from 'react'
import type { CssTunerProps } from '../core/types'
import { ShadowContainer } from '../ui/ShadowRoot'
import { Fab } from '../ui/Fab'
import { Panel } from '../ui/Panel'

const PANEL_WIDTH = 300

export function CssTuner({
  vars,
  position = 'bottom-left',
  persist = true,
  companionUrl,
}: CssTunerProps) {
  const [open, setOpen] = useState(false)

  // Pousser l'app vers la droite quand le panel est ouvert
  useEffect(() => {
    const body = document.body
    if (open) {
      body.style.transition = 'margin-left 200ms ease'
      body.style.marginLeft = `${PANEL_WIDTH}px`
    } else {
      body.style.marginLeft = ''
      // Nettoyer la transition apres l'animation
      const cleanup = () => { body.style.transition = '' }
      const id = setTimeout(cleanup, 200)
      return () => clearTimeout(id)
    }
    return () => {
      body.style.marginLeft = ''
      body.style.transition = ''
    }
  }, [open])

  // Auto-disable en production
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    return null
  }

  return (
    <ShadowContainer open={open} panelWidth={PANEL_WIDTH}>
      {!open && <Fab position={position} onClick={() => setOpen(true)} open={false} />}
      {open && (
        <Panel
          vars={vars}
          persist={persist}
          companionUrl={companionUrl}
          onClose={() => setOpen(false)}
          width={PANEL_WIDTH}
        />
      )}
    </ShadowContainer>
  )
}
