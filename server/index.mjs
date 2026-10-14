// Minimal Yjs sync server for Collaborative Whiteboard.
//
// It speaks the standard y-websocket protocol, so the browser's
// `WebsocketProvider` (see src/collaboration/providers.ts) connects to
// ws://<host>:<port>/<boardId>. Each board id is a separate Yjs document.
//
// Run:   npm run server            (PORT / HOST environment variables are honoured)
// Both:  npm run dev:collab        (this server + Vite pointed at it)
//
// Documents live in server memory for as long as the process runs. For durable
// storage, install `y-leveldb` and start the server with YPERSISTENCE=./server/data.

import http from 'node:http'
import { WebSocketServer } from 'ws'
import { setupWSConnection } from 'y-websocket/bin/utils'

const port = Number(process.env.PORT ?? 1234)
const host = process.env.HOST ?? '0.0.0.0'

const server = http.createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify({ ok: true }))
    return
  }
  response.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' })
  response.end('Collaborative Whiteboard sync server. Connect with a y-websocket client.\n')
})

const wss = new WebSocketServer({ noServer: true })

wss.on('connection', (socket, request) => {
  setupWSConnection(socket, request)
})

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request)
  })
})

server.listen(port, host, () => {
  console.log(`[sync] listening on ws://${host === '0.0.0.0' ? 'localhost' : host}:${port}`)
})

function shutdown() {
  console.log('[sync] shutting down')
  wss.clients.forEach((client) => client.close())
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 1500).unref()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
