import { memo } from 'react'
import { useEditorStore } from '@/store/editorStore'
import { usePresenceStore } from '@/store/presenceStore'
import { worldToScreen } from '@/utils/geometry'

/** Live cursors of the other people on the board, with name labels. */
function RemoteCursorsImpl() {
  const users = usePresenceStore((s) => s.remoteUsers)
  const viewport = useEditorStore((s) => s.viewport)

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden="true">
      {users.map((remote) => {
        if (!remote.cursor) return null
        const p = worldToScreen(remote.cursor, viewport)
        return (
          <div
            key={remote.clientId}
            className="absolute left-0 top-0 will-change-transform"
            style={{
              transform: `translate(${p.x}px, ${p.y}px)`,
              transition: 'transform 70ms linear',
            }}
          >
            <svg width="18" height="20" viewBox="0 0 18 20" fill="none">
              <path
                d="M1.5 1.2 16 8.6l-6.3 1.9-2.5 6.2z"
                fill={remote.user.color}
                stroke="#fff"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
            <span
              className="absolute left-4 top-4 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium text-white shadow"
              style={{ backgroundColor: remote.user.color }}
            >
              {remote.user.name}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export const RemoteCursors = memo(RemoteCursorsImpl)
