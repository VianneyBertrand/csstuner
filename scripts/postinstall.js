#!/usr/bin/env node

const RESET = '\x1b[0m'
const DIM = '\x1b[2m'
const BOLD = '\x1b[1m'
const CYAN = '\x1b[36m'

console.log()
console.log(`${BOLD}  ✦ CssTuner installed!${RESET}`)
console.log()
console.log(`${DIM}  Add this to your root layout:${RESET}`)
console.log()
console.log(`${CYAN}    import { CssTuner } from 'csstuner'${RESET}`)
console.log(`${CYAN}    <CssTuner />${RESET}`)
console.log()
console.log(`${DIM}  Auto-disabled in production. Zero config.${RESET}`)
console.log()
