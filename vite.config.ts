import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

function boardPublishPlugin(): Plugin {
  return {
    name: 'board-publish',
    configureServer(server) {
      server.middlewares.use('/api/publish', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end()
          return
        }

        let body = ''
        req.on('data', (chunk: Buffer) => { body += chunk.toString() })
        req.on('end', () => {
          try {
            const dest = path.resolve(__dirname, 'public/board.json')
            fs.writeFileSync(dest, body, 'utf-8')
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true }))
          } catch {
            res.statusCode = 500
            res.end(JSON.stringify({ ok: false }))
          }
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), boardPublishPlugin()],
})
