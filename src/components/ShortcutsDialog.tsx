import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useEditorStore } from '@/store/editorStore'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
const MOD = isMac ? '⌘' : 'Ctrl'

const GROUPS: ReadonlyArray<{ title: string; items: ReadonlyArray<[string, string[]]> }> = [
  {
    title: 'Tools',
    items: [
      ['Select', ['V']],
      ['Hand (pan)', ['H']],
      ['Rectangle', ['R']],
      ['Ellipse', ['O']],
      ['Line', ['L']],
      ['Arrow', ['A']],
      ['Pen', ['P']],
      ['Text', ['T']],
      ['Sticky note', ['N']],
    ],
  },
  {
    title: 'Editing',
    items: [
      ['Undo', [MOD, 'Z']],
      ['Redo', [MOD, 'Shift', 'Z']],
      ['Copy / Paste', [MOD, 'C', '/', MOD, 'V']],
      ['Duplicate', [MOD, 'D']],
      ['Select all', [MOD, 'A']],
      ['Delete', ['Del']],
      ['Edit text', ['Enter']],
      ['Nudge', ['Arrows']],
      ['Add to selection', ['Shift', 'Click']],
      ['Constrain angle / square', ['Shift', 'Drag']],
    ],
  },
  {
    title: 'Layers',
    items: [
      ['Bring forward / backward', [']', '/', '[']],
      ['Bring to front / back', [MOD, ']', '/', MOD, '[']],
    ],
  },
  {
    title: 'View',
    items: [
      ['Pan', ['Space', 'Drag']],
      ['Zoom', [MOD, 'Scroll']],
      ['Zoom in / out', ['+', '/', '−']],
      ['Reset zoom', ['0']],
      ['Fit to screen', ['Shift', '1']],
      ['Zoom to selection', ['Shift', '2']],
      ['Show shortcuts', ['?']],
    ],
  },
]

export function ShortcutsDialog() {
  const open = useEditorStore((s) => s.shortcutsOpen)
  const setOpen = useEditorStore((s) => s.setShortcutsOpen)

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content !w-[min(92vw,44rem)]">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold">Keyboard shortcuts</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted">
                Work faster without leaving the keyboard.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" aria-label="Close" className="icon-btn -mr-2 -mt-2">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {GROUPS.map((group) => (
              <section key={group.title}>
                <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted">
                  {group.title}
                </h3>
                <ul className="space-y-1.5">
                  {group.items.map(([label, keys]) => (
                    <li key={label} className="flex items-center justify-between gap-3 text-sm">
                      <span>{label}</span>
                      <span className="flex shrink-0 items-center gap-1">
                        {keys.map((key, index) =>
                          key === '/' ? (
                            <span key={index} className="text-xs text-muted">
                              or
                            </span>
                          ) : (
                            <kbd key={index} className="kbd-light">
                              {key}
                            </kbd>
                          ),
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
