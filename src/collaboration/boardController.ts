import * as Y from 'yjs'
import { nanoid } from 'nanoid'
import type { BoardObject, ObjectPatch, Point, ReorderMode } from '@/types/board'
import {
  META_KEY,
  OBJECTS_KEY,
  TEXT_FIELD,
  TITLE_KEY,
  objectToYMap,
  yMapToObject,
  type YObject,
} from './schema'

/** Transaction origin for edits made by this client. Only these are undoable. */
export const LOCAL_ORIGIN = 'local-user'

export const DEFAULT_TITLE = 'Untitled board'

export interface ObjectsSnapshot {
  readonly byId: ReadonlyMap<string, BoardObject>
  /** Objects sorted bottom-to-top. */
  readonly ordered: readonly BoardObject[]
}

export interface UpdateOptions {
  /**
   * Edits sharing the same key within a short window are merged into a single
   * undo step. Use it for continuous controls such as sliders.
   */
  coalesce?: string
}

export interface ObjectUpdate {
  id: string
  patch: ObjectPatch
}

const COALESCE_WINDOW_MS = 800

function compareObjects(a: BoardObject, b: BoardObject): number {
  return a.z - b.z || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i])
  }
  return false
}

/**
 * Owns the shared Yjs document for one board and exposes a typed, undoable
 * API on top of it. It also publishes an immutable snapshot of the board that
 * React can subscribe to (see `useBoardObjects`).
 *
 * The controller has no knowledge of React, Konva or the network.
 */
export class BoardController {
  readonly doc: Y.Doc
  readonly objects: Y.Map<YObject>
  readonly meta: Y.Map<unknown>
  readonly undoManager: Y.UndoManager

  private snapshot: ObjectsSnapshot = { byId: new Map(), ordered: [] }
  private readonly listeners = new Set<() => void>()
  private readonly historyListeners = new Set<() => void>()
  private lastCoalesceKey: string | null = null
  private lastCoalesceAt = 0
  private destroyed = false

  constructor(doc: Y.Doc = new Y.Doc()) {
    this.doc = doc
    this.objects = doc.getMap<YObject>(OBJECTS_KEY)
    this.meta = doc.getMap<unknown>(META_KEY)
    this.undoManager = new Y.UndoManager(this.objects, {
      trackedOrigins: new Set([LOCAL_ORIGIN]),
      captureTimeout: 400,
    })

    this.rebuildAll()
    this.objects.observeDeep(this.handleObjectsChange)

    const notifyHistory = () => this.historyListeners.forEach((l) => l())
    this.undoManager.on('stack-item-added', notifyHistory)
    this.undoManager.on('stack-item-popped', notifyHistory)
    this.undoManager.on('stack-cleared', notifyHistory)
  }

  // ---------------------------------------------------------------- subscriptions

  /** Subscribe to snapshot changes. Compatible with `useSyncExternalStore`. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = (): ObjectsSnapshot => this.snapshot

  subscribeHistory = (listener: () => void): (() => void) => {
    this.historyListeners.add(listener)
    return () => {
      this.historyListeners.delete(listener)
    }
  }

  subscribeTitle = (listener: () => void): (() => void) => {
    const observer = () => listener()
    this.meta.observe(observer)
    return () => this.meta.unobserve(observer)
  }

  getTitle = (): string => {
    const title = this.meta.get(TITLE_KEY)
    return typeof title === 'string' && title.length > 0 ? title : DEFAULT_TITLE
  }

  get canUndo(): boolean {
    return this.undoManager.undoStack.length > 0
  }

  get canRedo(): boolean {
    return this.undoManager.redoStack.length > 0
  }

  // ---------------------------------------------------------------- snapshot

  private handleObjectsChange = (events: Array<Y.YEvent<Y.AbstractType<unknown>>>) => {
    const dirty = new Set<string>()
    for (const event of events) {
      if (event.target === this.objects) {
        for (const key of (event as unknown as Y.YMapEvent<YObject>).keysChanged) dirty.add(key)
      } else {
        const id = event.path[0]
        if (typeof id === 'string') dirty.add(id)
      }
    }
    if (dirty.size > 0) this.applyDirty(dirty)
  }

  private rebuildAll() {
    this.applyDirty(new Set(this.objects.keys()), true)
  }

  private applyDirty(ids: Set<string>, reset = false) {
    const byId = new Map<string, BoardObject>(reset ? undefined : this.snapshot.byId)
    for (const id of ids) {
      const yObject = this.objects.get(id)
      const parsed = yObject ? yMapToObject(yObject) : null
      if (parsed) byId.set(id, parsed)
      else byId.delete(id)
    }
    const ordered = Array.from(byId.values()).sort(compareObjects)
    this.snapshot = { byId, ordered }
    this.listeners.forEach((l) => l())
  }

  getObject(id: string): BoardObject | undefined {
    return this.snapshot.byId.get(id)
  }

  getObjects(ids: readonly string[]): BoardObject[] {
    const result: BoardObject[] = []
    for (const id of ids) {
      const object = this.snapshot.byId.get(id)
      if (object) result.push(object)
    }
    return result
  }

  // ---------------------------------------------------------------- transactions

  private transact(fn: () => void, coalesceKey?: string) {
    if (this.destroyed) return
    const now = Date.now()
    const continuing =
      coalesceKey !== undefined &&
      coalesceKey === this.lastCoalesceKey &&
      now - this.lastCoalesceAt < COALESCE_WINDOW_MS
    if (!continuing) this.undoManager.stopCapturing()
    this.lastCoalesceKey = coalesceKey ?? null
    this.lastCoalesceAt = now
    this.doc.transact(fn, LOCAL_ORIGIN)
  }

  /** Ends the current undo step so the next edit starts a new one. */
  stopCapturing() {
    this.undoManager.stopCapturing()
    this.lastCoalesceKey = null
  }

  // ---------------------------------------------------------------- queries

  /** The z value to use for a new object so it appears on top. */
  nextZ(): number {
    const { ordered } = this.snapshot
    const top = ordered[ordered.length - 1]
    return top ? top.z + 1 : 1
  }

  // ---------------------------------------------------------------- mutations

  add(objects: readonly BoardObject[]) {
    if (objects.length === 0) return
    this.transact(() => {
      for (const object of objects) this.objects.set(object.id, objectToYMap(object))
    })
  }

  update(ids: readonly string[], patch: ObjectPatch, options: UpdateOptions = {}) {
    this.updateEach(
      ids.map((id) => ({ id, patch })),
      options,
    )
  }

  updateEach(updates: readonly ObjectUpdate[], options: UpdateOptions = {}) {
    if (updates.length === 0) return
    this.transact(() => {
      for (const { id, patch } of updates) {
        const target = this.objects.get(id)
        if (!target) continue
        for (const [key, value] of Object.entries(patch)) {
          // Only existing fields are patched, so a style change applied to a
          // mixed selection never leaks irrelevant fields onto an object.
          if (value === undefined || key === TEXT_FIELD || !target.has(key)) continue
          if (!sameValue(target.get(key), value)) target.set(key, value)
        }
      }
    }, options.coalesce)
  }

  remove(ids: readonly string[]) {
    const existing = ids.filter((id) => this.objects.has(id))
    if (existing.length === 0) return
    this.transact(() => {
      for (const id of existing) this.objects.delete(id)
    })
  }

  /** Clones objects with fresh ids on top of the stack. Returns the new ids. */
  cloneObjects(source: readonly BoardObject[], offset: Point, createdBy: string): string[] {
    if (source.length === 0) return []
    const sorted = [...source].sort(compareObjects)
    let z = this.nextZ() - 1
    const clones = sorted.map((object): BoardObject => {
      z += 1
      return {
        ...structuredClone(object),
        id: nanoid(10),
        x: object.x + offset.x,
        y: object.y + offset.y,
        z,
        createdBy,
      }
    })
    this.add(clones)
    return clones.map((c) => c.id)
  }

  duplicate(ids: readonly string[], createdBy: string, offset: Point = { x: 24, y: 24 }): string[] {
    return this.cloneObjects(this.getObjects(ids), offset, createdBy)
  }

  reorder(ids: readonly string[], mode: ReorderMode) {
    const selected = new Set(ids.filter((id) => this.snapshot.byId.has(id)))
    if (selected.size === 0) return
    const list = [...this.snapshot.ordered]

    if (mode === 'front' || mode === 'back') {
      const picked = list.filter((o) => selected.has(o.id))
      if (mode === 'front') {
        const top = (list[list.length - 1]?.z ?? 0) + 1
        this.updateEach(picked.map((o, i) => ({ id: o.id, patch: { z: top + i } })))
      } else {
        const bottom = (list[0]?.z ?? 0) - picked.length
        this.updateEach(picked.map((o, i) => ({ id: o.id, patch: { z: bottom + i } })))
      }
      return
    }

    // forward / backward: swap each selected object with its non-selected neighbour.
    const order = list.map((o) => o.id)
    let zs = list.map((o) => o.z)
    if (zs.some((z, i) => i > 0 && z <= (zs[i - 1] as number))) {
      // Duplicate z values (concurrent creation): normalise before swapping.
      zs = zs.map((_, i) => i)
    }

    if (mode === 'forward') {
      for (let i = order.length - 2; i >= 0; i--) {
        const a = order[i] as string
        const b = order[i + 1] as string
        if (selected.has(a) && !selected.has(b)) {
          order[i] = b
          order[i + 1] = a
        }
      }
    } else {
      for (let i = 1; i < order.length; i++) {
        const a = order[i - 1] as string
        const b = order[i] as string
        if (!selected.has(a) && selected.has(b)) {
          order[i - 1] = b
          order[i] = a
        }
      }
    }

    const updates: ObjectUpdate[] = []
    order.forEach((id, i) => {
      const next = zs[i] as number
      if (this.snapshot.byId.get(id)?.z !== next) updates.push({ id, patch: { z: next } })
    })
    this.updateEach(updates)
  }

  // ---------------------------------------------------------------- text

  getText(id: string): Y.Text | undefined {
    const value = this.objects.get(id)?.get(TEXT_FIELD)
    return value instanceof Y.Text ? value : undefined
  }

  /**
   * Replaces the text of an object by applying a minimal diff, so concurrent
   * edits from other users merge instead of being overwritten.
   */
  setText(id: string, next: string) {
    const text = this.getText(id)
    if (!text) return
    const prev = text.toString()
    if (prev === next) return

    let start = 0
    const shortest = Math.min(prev.length, next.length)
    while (start < shortest && prev.charCodeAt(start) === next.charCodeAt(start)) start++
    let prevEnd = prev.length
    let nextEnd = next.length
    while (
      prevEnd > start &&
      nextEnd > start &&
      prev.charCodeAt(prevEnd - 1) === next.charCodeAt(nextEnd - 1)
    ) {
      prevEnd--
      nextEnd--
    }

    this.transact(() => {
      if (prevEnd > start) text.delete(start, prevEnd - start)
      if (nextEnd > start) text.insert(start, next.slice(start, nextEnd))
    }, `text:${id}`)
  }

  // ---------------------------------------------------------------- meta

  setTitle(title: string) {
    const clean = title.trim().slice(0, 80)
    this.transactMeta(() => this.meta.set(TITLE_KEY, clean.length > 0 ? clean : DEFAULT_TITLE))
  }

  private transactMeta(fn: () => void) {
    if (this.destroyed) return
    // Meta is outside the undo scope; use a different origin to keep it out of history.
    this.doc.transact(fn, 'meta')
  }

  // ---------------------------------------------------------------- history

  undo() {
    this.lastCoalesceKey = null
    this.undoManager.stopCapturing()
    this.undoManager.undo()
  }

  redo() {
    this.lastCoalesceKey = null
    this.undoManager.stopCapturing()
    this.undoManager.redo()
  }

  destroy() {
    if (this.destroyed) return
    this.destroyed = true
    this.objects.unobserveDeep(this.handleObjectsChange)
    this.undoManager.destroy()
    this.listeners.clear()
    this.historyListeners.clear()
  }
}
