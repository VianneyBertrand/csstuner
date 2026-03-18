'use client'

import { useState } from 'react'
import type { CssTunerProps } from '../types'
import { Panel } from './Panel'
import { Fab } from './Fab'

export function CssTuner({
  vars,
  position = 'bottom-left',
  persist = true,
}: CssTunerProps) {
  const [open, setOpen] = useState(false)

  // Auto-disable in production
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    return null
  }

  return (
    <>
      <Fab position={position} onClick={() => setOpen(!open)} open={open} />
      {open && <Panel vars={vars} persist={persist} onClose={() => setOpen(false)} />}
    </>
  )
}
