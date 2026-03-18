import { createRoot } from 'react-dom/client'
import { CssTuner } from '../src/index'

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(<CssTuner />)
}
