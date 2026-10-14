import { create } from 'zustand'
import type {
  BoardObject,
  GridMode,
  ObjectPatch,
  ObjectType,
  Rect,
  Size,
  StyleDefaults,
  ThemePreference,
  ToolType,
  Viewport,
} from '@/types/board'
import type { ConnectionStatus, LocalUser } from '@/types/collab'
import { createDefaultStyles } from '@/utils/objectFactory'
import { createLocalUser } from '@/utils/names'
import { loadPref, savePref } from '@/utils/storage'

export interface ClipboardState {
  objects: BoardObject[]
  pasteCount: number
}

interface EditorState {
  // Tools and selection
  tool: ToolType
  selectedIds: string[]
  editingId: string | null
  spacePan: boolean
  isPanning: boolean

  // Canvas
  viewport: Viewport
  stageSize: Size
  draft: BoardObject | null
  marquee: Rect | null

  // Styling
  defaults: StyleDefaults

  // Clipboard and history
  clipboard: ClipboardState | null
  canUndo: boolean
  canRedo: boolean

  // Preferences
  theme: ThemePreference
  gridMode: GridMode
  minimapVisible: boolean
  shortcutsOpen: boolean

  // Collaboration
  connection: ConnectionStatus
  user: LocalUser

  // Actions
  setTool: (tool: ToolType) => void
  setSelection: (ids: readonly string[]) => void
  toggleSelection: (id: string) => void
  clearSelection: () => void
  setEditingId: (id: string | null) => void
  setSpacePan: (value: boolean) => void
  setIsPanning: (value: boolean) => void
  setViewport: (viewport: Viewport) => void
  setStageSize: (size: Size) => void
  setDraft: (draft: BoardObject | null) => void
  setMarquee: (marquee: Rect | null) => void
  patchDefaults: (types: readonly ObjectType[], patch: ObjectPatch) => void
  setClipboard: (clipboard: ClipboardState | null) => void
  setHistory: (canUndo: boolean, canRedo: boolean) => void
  setTheme: (theme: ThemePreference) => void
  setGridMode: (mode: GridMode) => void
  setMinimapVisible: (visible: boolean) => void
  setShortcutsOpen: (open: boolean) => void
  setConnection: (status: ConnectionStatus) => void
  setUserName: (name: string) => void
}

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i])
}

function loadUser(): LocalUser {
  const stored = loadPref<Partial<LocalUser> | null>('user', null)
  if (
    stored &&
    typeof stored.id === 'string' &&
    typeof stored.name === 'string' &&
    typeof stored.color === 'string'
  ) {
    return { id: stored.id, name: stored.name, color: stored.color }
  }
  const created = createLocalUser()
  savePref('user', created)
  return created
}

function loadTheme(): ThemePreference {
  const value = loadPref<string>('theme', 'system')
  return value === 'light' || value === 'dark' ? value : 'system'
}

function loadGrid(): GridMode {
  const value = loadPref<string>('grid', 'dots')
  return value === 'lines' || value === 'none' ? value : 'dots'
}

function defaultMinimapVisible(): boolean {
  const stored = loadPref<boolean | null>('minimap', null)
  if (typeof stored === 'boolean') return stored
  return typeof window !== 'undefined' ? window.innerWidth >= 768 : true
}

export const useEditorStore = create<EditorState>()((set, get) => ({
  tool: 'select',
  selectedIds: [],
  editingId: null,
  spacePan: false,
  isPanning: false,

  viewport: { x: 0, y: 0, zoom: 1 },
  stageSize: { width: 0, height: 0 },
  draft: null,
  marquee: null,

  defaults: createDefaultStyles(),

  clipboard: null,
  canUndo: false,
  canRedo: false,

  theme: loadTheme(),
  gridMode: loadGrid(),
  minimapVisible: defaultMinimapVisible(),
  shortcutsOpen: false,

  connection: 'local',
  user: loadUser(),

  setTool: (tool) => {
    if (get().tool === tool) return
    set({ tool, editingId: null })
  },

  setSelection: (ids) => {
    if (sameIds(get().selectedIds, ids)) return
    set({ selectedIds: [...ids] })
  },

  toggleSelection: (id) => {
    const current = get().selectedIds
    set({ selectedIds: current.includes(id) ? current.filter((i) => i !== id) : [...current, id] })
  },

  clearSelection: () => {
    if (get().selectedIds.length === 0) return
    set({ selectedIds: [] })
  },

  setEditingId: (editingId) => set({ editingId }),
  setSpacePan: (spacePan) => {
    if (get().spacePan !== spacePan) set({ spacePan })
  },
  setIsPanning: (isPanning) => {
    if (get().isPanning !== isPanning) set({ isPanning })
  },
  setViewport: (viewport) => set({ viewport }),
  setStageSize: (size) => {
    const current = get().stageSize
    if (current.width === size.width && current.height === size.height) return
    set({ stageSize: size })
  },
  setDraft: (draft) => set({ draft }),
  setMarquee: (marquee) => set({ marquee }),

  patchDefaults: (types, patch) => {
    const next: StyleDefaults = { ...get().defaults }
    for (const type of types) next[type] = { ...next[type], ...patch }
    set({ defaults: next })
  },

  setClipboard: (clipboard) => set({ clipboard }),
  setHistory: (canUndo, canRedo) => {
    const state = get()
    if (state.canUndo !== canUndo || state.canRedo !== canRedo) set({ canUndo, canRedo })
  },

  setTheme: (theme) => {
    savePref('theme', theme)
    set({ theme })
  },
  setGridMode: (gridMode) => {
    savePref('grid', gridMode)
    set({ gridMode })
  },
  setMinimapVisible: (minimapVisible) => {
    savePref('minimap', minimapVisible)
    set({ minimapVisible })
  },
  setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),

  setConnection: (connection) => set({ connection }),

  setUserName: (name) => {
    const clean = name.trim().slice(0, 32)
    if (clean.length === 0) return
    const user = { ...get().user, name: clean }
    savePref('user', user)
    set({ user })
  },
}))
