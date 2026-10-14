import type { LocalUser } from '@/types/collab'
import { initialsOf } from '@/utils/colors'
import { cn } from '@/utils/cn'

interface AvatarProps {
  user: LocalUser
  you?: boolean
  className?: string
}

export function Avatar({ user, you = false, className }: AvatarProps) {
  return (
    <span
      role="img"
      aria-label={you ? `${user.name} (you)` : user.name}
      title={you ? `${user.name} (you)` : user.name}
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-surface text-[11px] font-semibold text-white',
        className,
      )}
      style={{ backgroundColor: user.color }}
    >
      {initialsOf(user.name)}
    </span>
  )
}
