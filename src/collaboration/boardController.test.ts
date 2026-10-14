import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import type { BoardObject } from '@/types/board'
import { buildObject } from '@/utils/objectFactory'
import { BoardController } from './boardController'

function rect(id: string, z: number): BoardObject {
  return buildObject({
    id,
    type: 'rectangle',
    x: 10,
    y: 20,
    z,
    createdBy: 'tester',
    width: 100,
    height: 50,
    style: {},
  })
}

function sticky(id: string, text: string): BoardObject {
  return buildObject({
    id,
    type: 'sticky',
    x: 0,
    y: 0,
    z: 1,
    createdBy: 'tester',
    width: 200,
    height: 200,
    text,
    style: {},
  })
}

/** Connects two documents so every update flows both ways. */
function link(a: Y.Doc, b: Y.Doc) {
  a.on('update', (update: Uint8Array, origin: unknown) => {
    if (origin !== 'remote') Y.applyUpdate(b, update, 'remote')
  })
  b.on('update', (update: Uint8Array, origin: unknown) => {
    if (origin !== 'remote') Y.applyUpdate(a, update, 'remote')
  })
}

describe('BoardController', () => {
  it('adds, updates and removes objects', () => {
    const board = new BoardController()
    board.add([rect('a', 1)])
    expect(board.getSnapshot().ordered).toHaveLength(1)

    board.update(['a'], { x: 99, fill: '#ff0000' })
    const updated = board.getObject('a')
    expect(updated?.x).toBe(99)
    expect(updated && 'fill' in updated ? updated.fill : null).toBe('#ff0000')

    board.remove(['a'])
    expect(board.getSnapshot().ordered).toHaveLength(0)
  })

  it('ignores style fields an object does not have', () => {
    const board = new BoardController()
    board.add([rect('a', 1)])
    board.update(['a'], { fontSize: 40 })
    expect(board.getObject('a')).not.toHaveProperty('fontSize')
  })

  it('undoes and redoes local edits', () => {
    const board = new BoardController()
    board.add([rect('a', 1)])
    board.undo()
    expect(board.getSnapshot().ordered).toHaveLength(0)
    board.redo()
    expect(board.getSnapshot().ordered).toHaveLength(1)
  })

  it('reorders objects', () => {
    const board = new BoardController()
    board.add([rect('a', 1), rect('b', 2), rect('c', 3)])

    board.reorder(['a'], 'front')
    expect(board.getSnapshot().ordered.map((o) => o.id)).toEqual(['b', 'c', 'a'])

    board.reorder(['a'], 'backward')
    expect(board.getSnapshot().ordered.map((o) => o.id)).toEqual(['b', 'a', 'c'])

    board.reorder(['c'], 'back')
    expect(board.getSnapshot().ordered.map((o) => o.id)).toEqual(['c', 'b', 'a'])

    board.reorder(['c'], 'forward')
    expect(board.getSnapshot().ordered.map((o) => o.id)).toEqual(['b', 'c', 'a'])
  })

  it('duplicates objects on top with new ids', () => {
    const board = new BoardController()
    board.add([rect('a', 1)])
    const [copy] = board.duplicate(['a'], 'tester')
    expect(copy).toBeDefined()
    expect(copy).not.toBe('a')
    expect(board.getSnapshot().ordered.at(-1)?.id).toBe(copy)
    expect(board.getObject(copy as string)?.x).toBe(34)
  })

  it('syncs objects between two documents', () => {
    const first = new BoardController()
    const second = new BoardController()
    link(first.doc, second.doc)

    first.add([rect('a', 1)])
    expect(second.getObject('a')).toBeDefined()

    second.update(['a'], { x: 500 })
    expect(first.getObject('a')?.x).toBe(500)

    first.remove(['a'])
    expect(second.getObject('a')).toBeUndefined()
  })

  it('merges concurrent edits to different fields of one object', () => {
    const first = new BoardController()
    const second = new BoardController()
    first.add([rect('a', 1)])
    Y.applyUpdate(second.doc, Y.encodeStateAsUpdate(first.doc))

    // Edit while disconnected, then exchange state.
    first.update(['a'], { x: 300 })
    second.update(['a'], { fill: '#00ff00' })
    Y.applyUpdate(second.doc, Y.encodeStateAsUpdate(first.doc))
    Y.applyUpdate(first.doc, Y.encodeStateAsUpdate(second.doc))

    for (const board of [first, second]) {
      const merged = board.getObject('a')
      expect(merged?.x).toBe(300)
      expect(merged && 'fill' in merged ? merged.fill : null).toBe('#00ff00')
    }
  })

  it('merges concurrent text edits instead of overwriting', () => {
    const first = new BoardController()
    const second = new BoardController()
    first.add([sticky('n', 'hello world')])
    Y.applyUpdate(second.doc, Y.encodeStateAsUpdate(first.doc))

    first.setText('n', 'oh hello world')
    second.setText('n', 'hello world!')
    Y.applyUpdate(second.doc, Y.encodeStateAsUpdate(first.doc))
    Y.applyUpdate(first.doc, Y.encodeStateAsUpdate(second.doc))

    const a = first.getText('n')?.toString()
    const b = second.getText('n')?.toString()
    expect(a).toBe(b)
    expect(a).toBe('oh hello world!')
  })

  it('only undoes local changes, not remote ones', () => {
    const first = new BoardController()
    const second = new BoardController()
    link(first.doc, second.doc)

    first.add([rect('a', 1)])
    second.add([rect('b', 2)])
    first.undo()

    expect(first.getObject('a')).toBeUndefined()
    expect(first.getObject('b')).toBeDefined()
  })
})
