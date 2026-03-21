import { createServer, type IncomingMessage, type ServerResponse } from 'http'
import { findCssFile } from './cssFileDetector'
import { applyChanges } from './cssFileWriter'

const PORT = parseInt(process.argv.find(a => a.startsWith('--port='))?.split('=')[1] ?? '5599', 10)
const PROJECT_ROOT = process.cwd()

// --help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`Usage: csstuner [--port=5599]`)
  console.log(`  Companion server for CssTuner overlay.`)
  console.log(`  Detects your CSS file and saves design token changes.`)
  process.exit(0)
}

// Detecter le fichier CSS au demarrage
const cssFile = findCssFile(PROJECT_ROOT)

if (cssFile) {
  console.log(`\x1b[32m✓\x1b[0m CssTuner companion`)
  console.log(`  CSS file : ${cssFile}`)
  console.log(`  Port     : ${PORT}`)
} else {
  console.log(`\x1b[33m!\x1b[0m CssTuner companion`)
  console.log(`  No CSS file with design tokens found in ${PROJECT_ROOT}`)
  console.log(`  Save will be disabled. Copy CSS still works.`)
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  // GET /health
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, cssFile }))
    return
  }

  // POST /save
  if (req.method === 'POST' && req.url === '/save') {
    if (!cssFile) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'No CSS file detected' }))
      return
    }

    try {
      const body = await readBody(req)
      const payload = JSON.parse(body)
      const rawVars = payload.vars

      if (!rawVars || typeof rawVars !== 'object') {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid format: expected { vars: { light: {...}, dark: {...} } }' }))
        return
      }

      // Support ancien format (flat) et nouveau format (light/dark)
      const light = rawVars.light ?? rawVars
      const dark = rawVars.dark ?? {}

      let count = 0
      if (Object.keys(light).length > 0) {
        applyChanges(cssFile, light, ':root')
        count += Object.keys(light).length
      }
      if (Object.keys(dark).length > 0) {
        applyChanges(cssFile, dark, '.dark')
        count += Object.keys(dark).length
      }

      console.log(`  \x1b[32m✓\x1b[0m ${count} variable${count > 1 ? 's' : ''} saved`)

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, file: cssFile }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error(`  \x1b[31m✗\x1b[0m Save failed: ${message}`)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: message }))
    }
    return
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found' }))
})

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\x1b[31m✗\x1b[0m Port ${PORT} is already in use.`)
    console.error(`  Another CssTuner companion may be running.`)
    console.error(`  Use --port=XXXX to pick a different port.`)
    process.exit(1)
  }
  throw err
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n  CssTuner companion stopped.`)
  server.close()
  process.exit(0)
})
process.on('SIGTERM', () => {
  server.close()
  process.exit(0)
})

server.listen(PORT, () => {
  console.log(`  \x1b[34m→\x1b[0m http://localhost:${PORT}`)
  console.log()
})

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString()))
    req.on('error', reject)
  })
}
