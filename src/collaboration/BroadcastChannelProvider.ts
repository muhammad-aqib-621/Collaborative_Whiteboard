import type * as Y from 'yjs'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'
import * as syncProtocol from 'y-protocols/sync'
import * as awarenessProtocol from 'y-protocols/awareness'

const MESSAGE_SYNC = 0
const MESSAGE_AWARENESS = 1
const MESSAGE_QUERY_AWARENESS = 3

/**
 * A minimal Yjs provider that syncs a document and its awareness state between
 * browser tabs of the same origin using the BroadcastChannel API.
 *
 * It needs no server, which makes it the default "local development"
 * transport: open the same board in two tabs and edits flow between them. It
 * speaks the same message framing as y-websocket, so both providers can run
 * against one document at the same time.
 */
export class BroadcastChannelProvider {
  private readonly channel: BroadcastChannel
  private destroyed = false

  constructor(
    private readonly doc: Y.Doc,
    private readonly awareness: awarenessProtocol.Awareness,
    roomId: string,
  ) {
    this.channel = new BroadcastChannel(`collaborative-whiteboard:${roomId}`)
    this.channel.onmessage = (event: MessageEvent) => {
      this.handleMessage(new Uint8Array(event.data as ArrayBuffer))
    }

    doc.on('update', this.handleDocUpdate)
    awareness.on('update', this.handleAwarenessUpdate)
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.handleUnload)
    }

    // Ask other tabs for their state and tell them about ours.
    this.send(this.encodeSyncStep1())
    this.send(this.encodeQueryAwareness())
    this.send(this.encodeAwareness([doc.clientID]))
  }

  private send(message: Uint8Array) {
    if (this.destroyed) return
    // Copy into a standalone buffer so the structured clone is self-contained.
    this.channel.postMessage(message.slice().buffer)
  }

  private encodeSyncStep1(): Uint8Array {
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MESSAGE_SYNC)
    syncProtocol.writeSyncStep1(encoder, this.doc)
    return encoding.toUint8Array(encoder)
  }

  private encodeQueryAwareness(): Uint8Array {
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MESSAGE_QUERY_AWARENESS)
    return encoding.toUint8Array(encoder)
  }

  private encodeAwareness(clients: number[]): Uint8Array {
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS)
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(this.awareness, clients),
    )
    return encoding.toUint8Array(encoder)
  }

  private handleMessage(message: Uint8Array) {
    const decoder = decoding.createDecoder(message)
    const type = decoding.readVarUint(decoder)

    switch (type) {
      case MESSAGE_SYNC: {
        const encoder = encoding.createEncoder()
        encoding.writeVarUint(encoder, MESSAGE_SYNC)
        syncProtocol.readSyncMessage(decoder, encoder, this.doc, this)
        // A length above 1 means a reply (sync step 2) was written.
        if (encoding.length(encoder) > 1) this.send(encoding.toUint8Array(encoder))
        break
      }
      case MESSAGE_QUERY_AWARENESS: {
        this.send(this.encodeAwareness(Array.from(this.awareness.getStates().keys())))
        break
      }
      case MESSAGE_AWARENESS: {
        awarenessProtocol.applyAwarenessUpdate(
          this.awareness,
          decoding.readVarUint8Array(decoder),
          this,
        )
        break
      }
      default:
        break
    }
  }

  private handleDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === this) return
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MESSAGE_SYNC)
    syncProtocol.writeUpdate(encoder, update)
    this.send(encoding.toUint8Array(encoder))
  }

  private handleAwarenessUpdate = (
    changes: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown,
  ) => {
    if (origin === this) return
    const clients = changes.added.concat(changes.updated, changes.removed)
    this.send(this.encodeAwareness(clients))
  }

  private handleUnload = () => {
    awarenessProtocol.removeAwarenessStates(this.awareness, [this.doc.clientID], 'window unload')
  }

  destroy() {
    if (this.destroyed) return
    awarenessProtocol.removeAwarenessStates(this.awareness, [this.doc.clientID], 'destroy')
    this.destroyed = true
    this.doc.off('update', this.handleDocUpdate)
    this.awareness.off('update', this.handleAwarenessUpdate)
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.handleUnload)
    }
    this.channel.close()
  }
}
