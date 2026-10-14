import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Check, Copy, X } from 'lucide-react'
import { useSession } from '@/collaboration/BoardProvider'
import { getCollabServerUrl } from '@/collaboration/config'
import { boardPath } from '@/hooks/useRoute'
import { useEditorStore } from '@/store/editorStore'

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const area = document.createElement('textarea')
      area.value = text
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      const ok = document.execCommand('copy')
      area.remove()
      return ok
    } catch {
      return false
    }
  }
}

export function ShareDialog({ open, onOpenChange }: ShareDialogProps) {
  const session = useSession()
  const user = useEditorStore((s) => s.user)
  const setUserName = useEditorStore((s) => s.setUserName)
  const [copied, setCopied] = useState(false)
  const [name, setName] = useState(user.name)

  const { origin, pathname, search } = window.location
  const link = `${origin}${pathname}${search}${boardPath(session.roomId)}`
  const serverUrl = getCollabServerUrl()

  useEffect(() => {
    if (open) setName(user.name)
  }, [open, user.name])

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1800)
    return () => window.clearTimeout(timer)
  }, [copied])

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold">Share this board</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted">
                Anyone with the link can view and edit this board.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" aria-label="Close" className="icon-btn -mr-2 -mt-2">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <label className="mb-1 block text-xs font-medium text-muted" htmlFor="share-link">
            Board link
          </label>
          <div className="flex gap-2">
            <input
              id="share-link"
              readOnly
              value={link}
              onFocus={(event) => event.currentTarget.select()}
              className="input"
            />
            <button
              type="button"
              className="btn shrink-0"
              onClick={async () => setCopied(await copyText(link))}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <div className="mt-5 rounded-xl bg-surface-2 p-3 text-sm">
            {serverUrl ? (
              <p>
                <strong className="font-semibold">Server sync is on.</strong> This board syncs through{' '}
                <code className="rounded bg-surface px-1 py-0.5 text-xs">{serverUrl}</code>, so anyone who can
                reach that server and opens the link joins the same board.
              </p>
            ) : (
              <p>
                <strong className="font-semibold">Local mode.</strong> Tabs of this browser sync with each other
                and the board is saved on this device. To collaborate across devices, run{' '}
                <code className="rounded bg-surface px-1 py-0.5 text-xs">npm run dev:collab</code> or point the app
                at a sync server (see the README).
              </p>
            )}
          </div>

          <label className="mb-1 mt-5 block text-xs font-medium text-muted" htmlFor="display-name">
            Your display name
          </label>
          <input
            id="display-name"
            value={name}
            maxLength={32}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => (name.trim() ? setUserName(name) : setName(user.name))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
            }}
            className="input"
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
