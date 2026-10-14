import { useBoardObjects } from '@/collaboration/BoardProvider'
import { useEditorStore } from '@/store/editorStore'

const TIPS: ReadonlyArray<[string[], string]> = [
  [['R', 'O', 'L', 'A'], 'draw shapes, lines and arrows'],
  [['P'], 'sketch freehand'],
  [['T', 'N'], 'add text or a sticky note'],
  [['Space'], 'hold and drag to pan'],
  [['Ctrl', 'Scroll'], 'to zoom'],
]

/** Shown over an empty board to explain how to get started. */
export function EmptyState() {
  const objects = useBoardObjects()
  const draft = useEditorStore((s) => s.draft)
  const tool = useEditorStore((s) => s.tool)
  if (objects.ordered.length > 0 || draft || tool === 'pen') return null

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <h2 className="text-xl font-semibold">A blank canvas</h2>
        <p className="mt-2 text-sm text-muted">
          Pick a tool from the toolbar and click or drag on the board. Share the link to bring others in.
        </p>
        <ul className="mt-5 space-y-2 text-left text-sm text-muted">
          {TIPS.map(([keys, text]) => (
            <li key={text} className="flex items-center gap-2">
              <span className="flex shrink-0 gap-1">
                {keys.map((key) => (
                  <kbd key={key} className="kbd-light">
                    {key}
                  </kbd>
                ))}
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
