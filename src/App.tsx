import * as Tooltip from '@radix-ui/react-tooltip'
import { useRoute, boardPath } from '@/hooks/useRoute'
import { useThemeEffect } from '@/hooks/useTheme'
import { BoardPage } from '@/pages/BoardPage'
import { HomePage } from '@/pages/HomePage'

export default function App() {
  useThemeEffect()
  const { route, navigate } = useRoute()

  return (
    <Tooltip.Provider delayDuration={350} skipDelayDuration={200}>
      {route.name === 'board' ? (
        <BoardPage key={route.roomId} roomId={route.roomId} onHome={() => navigate('#/')} />
      ) : (
        <HomePage onOpenBoard={(roomId) => navigate(boardPath(roomId))} />
      )}
    </Tooltip.Provider>
  )
}
