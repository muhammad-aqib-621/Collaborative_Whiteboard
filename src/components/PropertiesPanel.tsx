import { useMemo, type ReactNode } from 'react'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Bold,
  BringToFront,
  Copy,
  Italic,
  SendToBack,
  Trash2,
} from 'lucide-react'
import { useBoardObjects } from '@/collaboration/BoardProvider'
import { useBoardActions } from '@/hooks/useBoardActions'
import { useResolvedTheme } from '@/hooks/useTheme'
import { useEditorStore } from '@/store/editorStore'
import type { BoardObject, DashStyle, FontFamilyKey, ObjectPatch, ObjectType, TextAlign } from '@/types/board'
import { isCreationTool } from '@/types/board'
import { resolveColor, toHexInput } from '@/utils/colors'
import {
  FILL_PALETTE,
  FONT_LABELS,
  FONT_STACKS,
  NONE,
  NOTE_PALETTE,
  STROKE_PALETTE,
  STROKE_WIDTHS,
} from '@/utils/constants'
import { cn } from '@/utils/cn'
import { IconButton } from './ui/IconButton'
import { Slider } from './ui/Slider'

const TYPE_LABELS: Record<ObjectType, string> = {
  rectangle: 'Rectangle',
  ellipse: 'Ellipse',
  line: 'Line',
  arrow: 'Arrow',
  pen: 'Pen stroke',
  text: 'Text',
  sticky: 'Sticky note',
}

const FILL_TYPES: readonly ObjectType[] = ['rectangle', 'ellipse', 'sticky', 'text']
const STROKE_TYPES: readonly ObjectType[] = ['rectangle', 'ellipse', 'line', 'arrow', 'pen']
const DASH_TYPES: readonly ObjectType[] = ['rectangle', 'ellipse', 'line', 'arrow']
const TEXT_TYPES: readonly ObjectType[] = ['text', 'sticky']

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</h3>
      {children}
    </section>
  )
}

interface SwatchesProps {
  label: string
  value: string
  palette: readonly string[]
  theme: 'light' | 'dark'
  onChange: (value: string, continuous: boolean) => void
}

function Swatches({ label, value, palette, theme, onChange }: SwatchesProps) {
  const custom = !palette.includes(value) && value !== NONE
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {palette.map((color) => {
        const selected = color === value
        return (
          <button
            key={color}
            type="button"
            aria-label={color === NONE ? `${label}: none` : `${label}: ${color === 'ink' ? 'default' : color}`}
            aria-pressed={selected}
            title={color === NONE ? 'None' : undefined}
            onClick={() => onChange(color, false)}
            className={cn(
              'relative size-6 rounded-full border border-black/15 transition-transform hover:scale-110',
              selected && 'ring-2 ring-accent ring-offset-2 ring-offset-surface',
            )}
            style={{
              backgroundColor: color === NONE ? 'transparent' : resolveColor(color, theme),
              backgroundImage:
                color === NONE
                  ? 'linear-gradient(135deg, transparent 46%, #ef4444 46%, #ef4444 54%, transparent 54%)'
                  : undefined,
            }}
          />
        )
      })}
      <label
        className={cn(
          'relative inline-flex size-6 cursor-pointer items-center justify-center rounded-full border border-dashed border-muted text-[10px] text-muted transition-transform hover:scale-110',
          custom && 'ring-2 ring-accent ring-offset-2 ring-offset-surface',
        )}
        style={custom ? { backgroundColor: value, borderStyle: 'solid' } : undefined}
        title="Custom color"
      >
        {!custom && '+'}
        <input
          type="color"
          aria-label={`${label}: custom color`}
          value={toHexInput(value)}
          onChange={(event) => onChange(event.target.value, true)}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  )
}

function DashPreview({ dash }: { dash: DashStyle }) {
  const array = dash === 'dashed' ? '6 4' : dash === 'dotted' ? '1 4' : undefined
  return (
    <svg width="28" height="8" aria-hidden="true">
      <line
        x1="2"
        y1="4"
        x2="26"
        y2="4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={array}
      />
    </svg>
  )
}

/**
 * Contextual style controls. With a selection it edits the selected objects;
 * while a drawing tool is active it edits the defaults for new objects.
 */
export function PropertiesPanel() {
  const actions = useBoardActions()
  const objects = useBoardObjects()
  const theme = useResolvedTheme()
  const tool = useEditorStore((s) => s.tool)
  const selectedIds = useEditorStore((s) => s.selectedIds)
  const defaults = useEditorStore((s) => s.defaults)
  const patchDefaults = useEditorStore((s) => s.patchDefaults)

  const selected = useMemo(
    () =>
      selectedIds
        .map((id) => objects.byId.get(id))
        .filter((o): o is BoardObject => o !== undefined),
    [selectedIds, objects],
  )

  const creating = isCreationTool(tool)
  const types: ObjectType[] = useMemo(
    () => (creating ? [tool] : Array.from(new Set(selected.map((o) => o.type)))),
    [creating, tool, selected],
  )

  if (types.length === 0) return null

  const editingSelection = !creating
  const has = (list: readonly ObjectType[]) => types.some((t) => list.includes(t))
  const only = (list: readonly ObjectType[]) => types.every((t) => list.includes(t))

  const read = <T,>(key: keyof ObjectPatch): T | undefined => {
    if (editingSelection) {
      for (const object of selected) {
        if (key in object) return (object as unknown as Record<string, unknown>)[key] as T
      }
      return undefined
    }
    const source = defaults[types[0] as ObjectType] as unknown as Record<string, unknown>
    return source[key] as T | undefined
  }

  const apply = (patch: ObjectPatch, coalesce?: string) => {
    if (editingSelection) actions.applyStyle(selectedIds, patch, coalesce)
    patchDefaults(types, patch)
  }

  const title = creating
    ? `New ${TYPE_LABELS[tool].toLowerCase()} style`
    : selected.length === 1 && selected[0]
      ? TYPE_LABELS[selected[0].type]
      : `${selected.length} objects selected`

  const fill = read<string>('fill') ?? NONE
  const stroke = read<string>('stroke') ?? 'ink'
  const strokeWidth = read<number>('strokeWidth') ?? 2
  const dash = read<DashStyle>('dash') ?? 'solid'
  const radius = read<number>('cornerRadius') ?? 0
  const opacity = read<number>('opacity') ?? 1
  const fontFamily = read<FontFamilyKey>('fontFamily') ?? 'sans'
  const fontSize = read<number>('fontSize') ?? 20
  const bold = read<boolean>('bold') ?? false
  const italic = read<boolean>('italic') ?? false
  const align = read<TextAlign>('align') ?? 'left'

  const fillLabel = only(['text']) ? 'Text color' : only(['sticky']) ? 'Note color' : 'Fill'
  const fillPalette = only(['sticky']) ? NOTE_PALETTE : only(['text']) ? STROKE_PALETTE : FILL_PALETTE

  return (
    <aside
      aria-label="Properties"
      className="panel absolute bottom-[8rem] left-2 right-2 z-20 max-h-[40vh] space-y-4 overflow-y-auto p-3 md:bottom-auto md:left-auto md:right-3 md:top-16 md:max-h-[calc(100vh-9rem)] md:w-64 md:p-4 scroll-thin"
    >
      <h2 className="text-sm font-semibold">{title}</h2>

      {has(FILL_TYPES) && (
        <Section label={fillLabel}>
          <Swatches
            label={fillLabel}
            value={fill}
            palette={fillPalette}
            theme={theme}
            onChange={(value, continuous) => apply({ fill: value }, continuous ? 'fill' : undefined)}
          />
        </Section>
      )}

      {has(STROKE_TYPES) && (
        <Section label="Stroke">
          <Swatches
            label="Stroke color"
            value={stroke}
            palette={STROKE_PALETTE}
            theme={theme}
            onChange={(value, continuous) => apply({ stroke: value }, continuous ? 'stroke' : undefined)}
          />
          <ToggleGroup.Root
            type="single"
            aria-label="Stroke width"
            className="seg"
            value={String(strokeWidth)}
            onValueChange={(value) => value && apply({ strokeWidth: Number(value) })}
          >
            {STROKE_WIDTHS.map((width) => (
              <ToggleGroup.Item
                key={width}
                value={String(width)}
                aria-label={`Stroke width ${width}`}
                className="seg-item"
              >
                <span className="block w-5 rounded-full bg-current" style={{ height: Math.min(width, 8) }} />
              </ToggleGroup.Item>
            ))}
          </ToggleGroup.Root>
        </Section>
      )}

      {has(DASH_TYPES) && (
        <Section label="Line style">
          <ToggleGroup.Root
            type="single"
            aria-label="Line style"
            className="seg"
            value={dash}
            onValueChange={(value) => value && apply({ dash: value as DashStyle })}
          >
            {(['solid', 'dashed', 'dotted'] as const).map((style) => (
              <ToggleGroup.Item key={style} value={style} aria-label={style} className="seg-item">
                <DashPreview dash={style} />
              </ToggleGroup.Item>
            ))}
          </ToggleGroup.Root>
        </Section>
      )}

      {has(['rectangle']) && (
        <Section label={`Corner radius · ${Math.round(radius)}`}>
          <Slider
            label="Corner radius"
            value={radius}
            min={0}
            max={48}
            onChange={(value) => apply({ cornerRadius: value }, 'radius')}
          />
        </Section>
      )}

      {has(TEXT_TYPES) && (
        <Section label="Text">
          <ToggleGroup.Root
            type="single"
            aria-label="Font"
            className="seg"
            value={fontFamily}
            onValueChange={(value) => value && apply({ fontFamily: value as FontFamilyKey })}
          >
            {(Object.keys(FONT_LABELS) as FontFamilyKey[]).map((key) => (
              <ToggleGroup.Item
                key={key}
                value={key}
                aria-label={`${FONT_LABELS[key]} font`}
                className="seg-item"
                style={{ fontFamily: FONT_STACKS[key] }}
              >
                {FONT_LABELS[key]}
              </ToggleGroup.Item>
            ))}
          </ToggleGroup.Root>

          <div className="flex items-center gap-2">
            <label className="flex flex-1 items-center gap-2 text-xs text-muted">
              Size
              <input
                type="number"
                min={8}
                max={200}
                step={1}
                value={Math.round(fontSize)}
                aria-label="Font size"
                onChange={(event) => {
                  const next = Number(event.target.value)
                  if (Number.isFinite(next) && next >= 8 && next <= 200) {
                    apply({ fontSize: next }, 'fontSize')
                  }
                }}
                className="input h-8 w-full"
              />
            </label>
            <IconButton
              label="Bold"
              active={bold}
              className="size-8"
              onClick={() => apply({ bold: !bold })}
            >
              <Bold size={15} />
            </IconButton>
            <IconButton
              label="Italic"
              active={italic}
              className="size-8"
              onClick={() => apply({ italic: !italic })}
            >
              <Italic size={15} />
            </IconButton>
          </div>

          <ToggleGroup.Root
            type="single"
            aria-label="Text alignment"
            className="seg"
            value={align}
            onValueChange={(value) => value && apply({ align: value as TextAlign })}
          >
            <ToggleGroup.Item value="left" aria-label="Align left" className="seg-item">
              <AlignLeft size={15} />
            </ToggleGroup.Item>
            <ToggleGroup.Item value="center" aria-label="Align center" className="seg-item">
              <AlignCenter size={15} />
            </ToggleGroup.Item>
            <ToggleGroup.Item value="right" aria-label="Align right" className="seg-item">
              <AlignRight size={15} />
            </ToggleGroup.Item>
          </ToggleGroup.Root>
        </Section>
      )}

      <Section label={`Opacity · ${Math.round(opacity * 100)}%`}>
        <Slider
          label="Opacity"
          value={opacity}
          min={0.1}
          max={1}
          step={0.05}
          onChange={(value) => apply({ opacity: Math.round(value * 100) / 100 }, 'opacity')}
        />
      </Section>

      {editingSelection && (
        <Section label="Arrange">
          <div className="flex items-center justify-between">
            <IconButton label="Bring to front" shortcut="⌘]" onClick={() => actions.reorderSelection('front')}>
              <BringToFront size={16} />
            </IconButton>
            <IconButton label="Bring forward" shortcut="]" onClick={() => actions.reorderSelection('forward')}>
              <ArrowUp size={16} />
            </IconButton>
            <IconButton label="Send backward" shortcut="[" onClick={() => actions.reorderSelection('backward')}>
              <ArrowDown size={16} />
            </IconButton>
            <IconButton label="Send to back" shortcut="⌘[" onClick={() => actions.reorderSelection('back')}>
              <SendToBack size={16} />
            </IconButton>
            <span className="mx-0.5 h-5 w-px bg-line" aria-hidden="true" />
            <IconButton label="Duplicate" shortcut="⌘D" onClick={() => actions.duplicateSelection()}>
              <Copy size={16} />
            </IconButton>
            <IconButton
              label="Delete"
              shortcut="⌫"
              className="text-danger hover:text-danger"
              onClick={() => actions.deleteSelection()}
            >
              <Trash2 size={16} />
            </IconButton>
          </div>
        </Section>
      )}
    </aside>
  )
}
