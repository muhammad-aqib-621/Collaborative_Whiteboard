import { useState, type FormEvent } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ArrowRight, Check, Monitor, Moon, Plus, Sun, X } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { useEditorStore } from '@/store/editorStore'
import type { ThemePreference } from '@/types/board'
import { generateRoomId, normalizeRoomId } from '@/utils/names'
import { forgetBoard, loadRecentBoards, type RecentBoard } from '@/utils/storage'

function timeAgo(timestamp: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  return `${Math.round(hours / 24)} d ago`
}

function ThemeMenu() {
  const theme = useEditorStore((s) => s.theme)
  const setTheme = useEditorStore((s) => s.setTheme)
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" aria-label="Change theme" className="icon-btn border border-line bg-surface">
          <Icon size={18} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} className="menu">
          <DropdownMenu.RadioGroup value={theme} onValueChange={(v) => setTheme(v as ThemePreference)}>
            {(
              [
                ['light', 'Light', Sun],
                ['dark', 'Dark', Moon],
                ['system', 'System', Monitor],
              ] as const
            ).map(([value, label, ItemIcon]) => (
              <DropdownMenu.RadioItem key={value} value={value} className="menu-item">
                <DropdownMenu.ItemIndicator className="menu-indicator">
                  <Check size={14} />
                </DropdownMenu.ItemIndicator>
                <ItemIcon size={15} className="text-muted" />
                {label}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

export function HomePage({ onOpenBoard }: { onOpenBoard: (roomId: string) => void }) {
  const user = useEditorStore((s) => s.user)
  const setUserName = useEditorStore((s) => s.setUserName)
  const [name, setName] = useState(user.name)
  const [joinValue, setJoinValue] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)
  const [recent, setRecent] = useState<RecentBoard[]>(() => loadRecentBoards())

  const commitName = () => {
    if (name.trim()) setUserName(name)
    else setName(user.name)
  }

  const join = (event: FormEvent) => {
    event.preventDefault()
    const roomId = normalizeRoomId(joinValue)
    if (!roomId) {
      setJoinError('Enter a board link or an ID (letters, numbers, - and _).')
      return
    }
    onOpenBoard(roomId)
  }

  return (
    <div className="h-full overflow-y-auto bg-canvas">
      <div className="mx-auto flex min-h-full max-w-3xl flex-col px-5 py-6 sm:py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-accent text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 17c4-9 7 4 10-4s4-4 6-7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </span>
            <span className="text-base font-semibold">Collaborative Whiteboard</span>
          </div>
          <ThemeMenu />
        </header>

        <main className="flex-1 py-12 sm:py-16">
          <h1 className="max-w-xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Think together on an infinite canvas.
          </h1>
          <p className="mt-4 max-w-lg text-base text-muted sm:text-lg">
            Sketch, diagram and brainstorm with sticky notes, shapes and freehand. Share a link and everyone
            edits the same board in real time.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-start">
            <button type="button" className="btn-primary" onClick={() => onOpenBoard(generateRoomId())}>
              <Plus size={18} />
              New board
            </button>
            <form onSubmit={join} className="flex flex-1 flex-col gap-1.5" noValidate>
              <div className="flex gap-2">
                <input
                  value={joinValue}
                  onChange={(event) => {
                    setJoinValue(event.target.value)
                    setJoinError(null)
                  }}
                  placeholder="Paste a board link or ID"
                  aria-label="Board link or ID"
                  aria-invalid={joinError !== null}
                  className="input h-10"
                />
                <button type="submit" className="btn h-10 shrink-0">
                  Join
                  <ArrowRight size={16} />
                </button>
              </div>
              {joinError && (
                <p role="alert" className="text-xs text-danger">
                  {joinError}
                </p>
              )}
            </form>
          </div>

          <section className="mt-10 rounded-2xl border border-line bg-surface p-4 sm:p-5">
            <h2 className="text-sm font-semibold">Your name on boards</h2>
            <div className="mt-3 flex items-center gap-3">
              <Avatar user={user} you />
              <input
                value={name}
                maxLength={32}
                aria-label="Display name"
                onChange={(event) => setName(event.target.value)}
                onBlur={commitName}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur()
                }}
                className="input max-w-xs"
              />
            </div>
          </section>

          <section className="mt-8" aria-labelledby="recent-heading">
            <h2 id="recent-heading" className="text-sm font-semibold">
              Recent boards
            </h2>
            {recent.length === 0 ? (
              <p className="mt-3 rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
                Boards you open appear here.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                {recent.map((board) => (
                  <li key={board.id} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => onOpenBoard(board.id)}
                      className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-2"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{board.title}</span>
                        <span className="block truncate text-xs text-muted">{board.id}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted">{timeAgo(board.openedAt)}</span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${board.title} from recent boards`}
                      title="Remove from list"
                      className="icon-btn mr-2"
                      onClick={() => {
                        forgetBoard(board.id)
                        setRecent(loadRecentBoards())
                      }}
                    >
                      <X size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}
