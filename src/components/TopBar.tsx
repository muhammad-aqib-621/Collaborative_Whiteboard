import { useEffect, useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  Check,
  ChevronLeft,
  Keyboard,
  LayoutGrid,
  Maximize,
  Menu,
  Monitor,
  Moon,
  Redo2,
  Share2,
  Sun,
  Trash2,
  Undo2,
} from 'lucide-react'
import { useBoard, useBoardTitle } from '@/collaboration/BoardProvider'
import { useBoardActions } from '@/hooks/useBoardActions'
import { useEditorStore } from '@/store/editorStore'
import { usePresenceStore } from '@/store/presenceStore'
import type { GridMode, ThemePreference } from '@/types/board'
import { ConnectionBadge } from './ConnectionBadge'
import { ShareDialog } from './ShareDialog'
import { Avatar } from './ui/Avatar'
import { IconButton } from './ui/IconButton'

const MAX_AVATARS = 4

function BoardTitle() {
  const board = useBoard()
  const title = useBoardTitle()
  const [draft, setDraft] = useState(title)

  useEffect(() => setDraft(title), [title])

  const commit = () => {
    const next = draft.trim()
    if (next.length === 0) setDraft(title)
    else if (next !== title) board.setTitle(next)
  }

  return (
    <input
      value={draft}
      aria-label="Board title"
      maxLength={80}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
        if (event.key === 'Escape') {
          setDraft(title)
          event.currentTarget.blur()
        }
      }}
      className="h-9 w-28 min-w-0 rounded-lg border border-transparent bg-transparent px-2 text-sm font-semibold hover:border-line focus:border-accent focus:outline-none sm:w-52"
    />
  )
}

function Presence() {
  const me = useEditorStore((s) => s.user)
  const remote = usePresenceStore((s) => s.remoteUsers)
  const shown = remote.slice(0, MAX_AVATARS)
  const extra = remote.length - shown.length

  return (
    <div className="flex items-center -space-x-2" aria-label={`${remote.length + 1} people on this board`}>
      {shown.map((r) => (
        <Avatar key={r.clientId} user={r.user} />
      ))}
      {extra > 0 && (
        <span className="inline-flex size-8 items-center justify-center rounded-full border-2 border-surface bg-surface-2 text-[11px] font-semibold">
          +{extra}
        </span>
      )}
      <Avatar user={me} you className="ring-2 ring-accent/60" />
    </div>
  )
}

function MainMenu() {
  const board = useBoard()
  const actions = useBoardActions()
  const theme = useEditorStore((s) => s.theme)
  const setTheme = useEditorStore((s) => s.setTheme)
  const gridMode = useEditorStore((s) => s.gridMode)
  const setGridMode = useEditorStore((s) => s.setGridMode)
  const minimapVisible = useEditorStore((s) => s.minimapVisible)
  const setMinimapVisible = useEditorStore((s) => s.setMinimapVisible)
  const setShortcutsOpen = useEditorStore((s) => s.setShortcutsOpen)

  const clearBoard = () => {
    const ids = board.getSnapshot().ordered.map((o) => o.id)
    if (ids.length === 0) return
    if (window.confirm(`Delete all ${ids.length} objects on this board? You can undo this with ${/Mac/.test(navigator.platform) ? '⌘' : 'Ctrl+'}Z.`)) {
      board.remove(ids)
      useEditorStore.getState().clearSelection()
    }
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" aria-label="Main menu" className="icon-btn">
          <Menu size={18} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} className="menu">
          <DropdownMenu.Label className="menu-label">Theme</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={theme} onValueChange={(v) => setTheme(v as ThemePreference)}>
            {(
              [
                ['light', 'Light', Sun],
                ['dark', 'Dark', Moon],
                ['system', 'System', Monitor],
              ] as const
            ).map(([value, label, Icon]) => (
              <DropdownMenu.RadioItem key={value} value={value} className="menu-item">
                <DropdownMenu.ItemIndicator className="menu-indicator">
                  <Check size={14} />
                </DropdownMenu.ItemIndicator>
                <Icon size={15} className="text-muted" />
                {label}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>

          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Label className="menu-label">Background</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={gridMode} onValueChange={(v) => setGridMode(v as GridMode)}>
            {(
              [
                ['dots', 'Dot grid'],
                ['lines', 'Line grid'],
                ['none', 'Plain'],
              ] as const
            ).map(([value, label]) => (
              <DropdownMenu.RadioItem key={value} value={value} className="menu-item">
                <DropdownMenu.ItemIndicator className="menu-indicator">
                  <Check size={14} />
                </DropdownMenu.ItemIndicator>
                <LayoutGrid size={15} className="text-muted" />
                {label}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
          <DropdownMenu.CheckboxItem
            checked={minimapVisible}
            onCheckedChange={(checked) => setMinimapVisible(checked === true)}
            className="menu-item hidden md:flex"
          >
            <DropdownMenu.ItemIndicator className="menu-indicator">
              <Check size={14} />
            </DropdownMenu.ItemIndicator>
            Show minimap
          </DropdownMenu.CheckboxItem>

          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item className="menu-item menu-item-plain" onSelect={() => actions.fitView()}>
            <Maximize size={15} className="text-muted" />
            Fit board to screen
          </DropdownMenu.Item>
          <DropdownMenu.Item className="menu-item menu-item-plain" onSelect={() => setShortcutsOpen(true)}>
            <Keyboard size={15} className="text-muted" />
            Keyboard shortcuts
          </DropdownMenu.Item>
          <DropdownMenu.Item className="menu-item menu-item-plain text-danger" onSelect={clearBoard}>
            <Trash2 size={15} />
            Clear board…
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

export function TopBar({ onHome }: { onHome: () => void }) {
  const actions = useBoardActions()
  const canUndo = useEditorStore((s) => s.canUndo)
  const canRedo = useEditorStore((s) => s.canRedo)
  const [shareOpen, setShareOpen] = useState(false)

  return (
    <>
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-2 p-2 md:p-3">
        <div className="panel pointer-events-auto flex items-center gap-1 p-1">
          <IconButton label="All boards" tooltipSide="bottom" onClick={onHome}>
            <ChevronLeft size={18} />
          </IconButton>
          <BoardTitle />
        </div>

        <div className="panel pointer-events-auto flex items-center gap-1 p-1 pl-2">
          <Presence />
          <ConnectionBadge />
          <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
          <IconButton
            label="Undo"
            shortcut="⌘Z"
            tooltipSide="bottom"
            disabled={!canUndo}
            onClick={() => actions.undo()}
          >
            <Undo2 size={17} />
          </IconButton>
          <IconButton
            label="Redo"
            shortcut="⇧⌘Z"
            tooltipSide="bottom"
            disabled={!canRedo}
            onClick={() => actions.redo()}
          >
            <Redo2 size={17} />
          </IconButton>
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-semibold text-white hover:opacity-90"
          >
            <Share2 size={15} />
            <span className="hidden sm:inline">Share</span>
          </button>
          <MainMenu />
        </div>
      </header>
      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} />
    </>
  )
}
