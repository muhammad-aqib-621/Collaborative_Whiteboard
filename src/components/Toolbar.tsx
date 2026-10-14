import {
  ArrowUpRight,
  Circle,
  Hand,
  Minus,
  MousePointer2,
  Pencil,
  Square,
  StickyNote,
  Type,
  type LucideIcon,
} from 'lucide-react'
import * as Separator from '@radix-ui/react-separator'
import { useEditorStore } from '@/store/editorStore'
import type { ToolType } from '@/types/board'
import { IconButton } from './ui/IconButton'

interface ToolDef {
  tool: ToolType
  label: string
  shortcut: string
  icon: LucideIcon
}

const TOOLS: readonly ToolDef[] = [
  { tool: 'select', label: 'Select', shortcut: 'V', icon: MousePointer2 },
  { tool: 'hand', label: 'Hand (pan)', shortcut: 'H', icon: Hand },
  { tool: 'rectangle', label: 'Rectangle', shortcut: 'R', icon: Square },
  { tool: 'ellipse', label: 'Ellipse', shortcut: 'O', icon: Circle },
  { tool: 'line', label: 'Line', shortcut: 'L', icon: Minus },
  { tool: 'arrow', label: 'Arrow', shortcut: 'A', icon: ArrowUpRight },
  { tool: 'pen', label: 'Pen', shortcut: 'P', icon: Pencil },
  { tool: 'text', label: 'Text', shortcut: 'T', icon: Type },
  { tool: 'sticky', label: 'Sticky note', shortcut: 'N', icon: StickyNote },
]

/** Tool palette. Vertical on desktop, a horizontal dock on small screens. */
export function Toolbar() {
  const tool = useEditorStore((s) => s.tool)
  const setTool = useEditorStore((s) => s.setTool)

  return (
    <nav
      aria-label="Tools"
      className="panel absolute bottom-3 left-1/2 z-20 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 flex-row items-center gap-0.5 overflow-x-auto p-1 md:bottom-auto md:left-3 md:top-1/2 md:max-w-none md:-translate-y-1/2 md:translate-x-0 md:flex-col md:overflow-visible"
    >
      {TOOLS.map(({ tool: value, label, shortcut, icon: Icon }, index) => (
        <div key={value} className="contents">
          {(index === 2 || index === 7) && (
            <Separator.Root
              decorative
              orientation="vertical"
              className="mx-1 h-6 w-px shrink-0 bg-line md:mx-0 md:my-1 md:h-px md:w-6"
            />
          )}
          <IconButton
            label={label}
            shortcut={shortcut}
            tooltipSide="right"
            active={tool === value}
            onClick={() => setTool(value)}
          >
            <Icon size={18} strokeWidth={2} />
          </IconButton>
        </div>
      ))}
    </nav>
  )
}
