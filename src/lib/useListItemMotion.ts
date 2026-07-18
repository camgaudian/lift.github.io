import { useState } from 'react'
import type { AnimatedListItemPhase } from '@/components/AnimatedListItem'

export type ListItemMotion<TIncoming = never> =
  | { phase: 'busy' }
  | { phase: 'exiting' }
  | { phase: 'swapping'; incoming: TIncoming }

export function useListItemMotion<TIncoming = never>() {
  const [motions, setMotions] = useState<Record<string, ListItemMotion<TIncoming>>>({})

  const clearMotion = (itemId: string) => {
    setMotions((prev) => {
      if (!(itemId in prev)) return prev
      const next = { ...prev }
      delete next[itemId]
      return next
    })
  }

  const setBusy = (itemId: string) => {
    setMotions((prev) => ({ ...prev, [itemId]: { phase: 'busy' } }))
  }

  const setExiting = (itemId: string) => {
    setMotions((prev) => ({ ...prev, [itemId]: { phase: 'exiting' } }))
  }

  const setSwapping = (itemId: string, incoming: TIncoming) => {
    setMotions((prev) => ({ ...prev, [itemId]: { phase: 'swapping', incoming } }))
  }

  const phaseOf = (itemId: string): AnimatedListItemPhase =>
    motions[itemId]?.phase ?? 'idle'

  return { motions, clearMotion, setBusy, setExiting, setSwapping, phaseOf }
}
