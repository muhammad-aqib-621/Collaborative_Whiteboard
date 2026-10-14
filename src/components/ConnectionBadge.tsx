import { useEditorStore } from '@/store/editorStore'
import type { ConnectionStatus } from '@/types/collab'
import { cn } from '@/utils/cn'

const STATUS: Record<ConnectionStatus, { label: string; hint: string; dot: string }> = {
  local: {
    label: 'Local',
    hint: 'Saved in this browser and synced between its tabs. Configure a sync server to collaborate across devices.',
    dot: 'bg-sky-500',
  },
  connecting: { label: 'Connecting…', hint: 'Connecting to the sync server.', dot: 'bg-amber-500 animate-[pulse-dot_1s_ease-in-out_infinite]' },
  connected: { label: 'Live', hint: 'Connected to the sync server.', dot: 'bg-emerald-500' },
  disconnected: {
    label: 'Offline',
    hint: 'Cannot reach the sync server. Your edits are kept locally and sync when it reconnects.',
    dot: 'bg-red-500',
  },
}

export function ConnectionBadge() {
  const status = useEditorStore((s) => s.connection)
  const { label, hint, dot } = STATUS[status]
  return (
    <span
      role="status"
      title={hint}
      className="inline-flex h-8 items-center gap-2 rounded-full bg-surface-2 px-3 text-xs font-medium"
    >
      <span className={cn('size-2 rounded-full', dot)} aria-hidden="true" />
      <span className="hidden sm:inline">{label}</span>
      <span className="sr-only sm:hidden">{label}</span>
    </span>
  )
}
