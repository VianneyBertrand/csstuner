import { createServer, type IncomingMessage, type ServerResponse } from 'http'
import { findCssFile } from './cssFileDetector'
import { detectFileFormat } from './formatDetector'
import { applyChanges } from './cssFileWriter'
import { readFileSync } from 'fs'

const PORT = parseInt(process.argv.find(a => a.startsWith('--port='))?.split('=')[1] ?? '5599', 10)
const PROJECT_ROOT = process.cwd()

// Detecter le fichier CSS au demarrage
const cssFile = findCssFile(PROJECT_ROOT)

if (cssFile) {
  console.log(`\x1b[32m✓\x1b[0m CssTuner companion`)
  console.log(`  Fichier CSS : ${cssFile}`)
  console.log(`  Port : ${PORT}`)
} else {
  console.log(`\x1b[33m!\x1b[0m CssTuner companion`)
  console.log(`  Aucun fichier CSS avec des design tokens trouve dans ${PROJECT_ROOT}`)
  console.log(`  Le save sera desactive.`)
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
      res.end(JSON.stringify({ error: 'Aucun fichier CSS detecte' }))
      return
    }

    try {
      const body = await readBody(req)
      const payload = JSON.parse(body)
      const vars = payload.vars as Record<string, string>

      if (!vars || typeof vars !== 'object') {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Format invalide : { vars: Record<string, string> }' }))
        return
      }

      const content = readFileSync(cssFile, 'utf-8')
      const format = detectFileFormat(content)

      applyChanges(cssFile, vars, format)

      console.log(`  \x1b[32m✓\x1b[0m ${Object.keys(vars).length} variable(s) sauvegardee(s)`)

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, format, file: cssFile }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: message }))
    }
    return
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found' }))
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
