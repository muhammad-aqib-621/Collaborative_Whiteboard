import type Konva from 'konva'

/**
 * Maps object ids to their live Konva nodes. The canvas renders objects from
 * state, but interactions like multi-object dragging and the transformer need
 * to reach the underlying nodes directly.
 */
const nodes = new Map<string, Konva.Group>()

export const nodeRegistry = {
  register(id: string, node: Konva.Group | null): void {
    if (node) nodes.set(id, node)
    else nodes.delete(id)
  },
  get(id: string): Konva.Group | undefined {
    return nodes.get(id)
  },
}
