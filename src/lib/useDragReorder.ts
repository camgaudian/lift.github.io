import { useEffect, useRef, useState, type CSSProperties } from 'react'

type RowMetrics = {
  tops: number[]
  heights: number[]
  gap: number
}

function measureRows(container: HTMLElement | null): RowMetrics | null {
  if (!container) return null
  const rows = Array.from(container.querySelectorAll<HTMLElement>(':scope > [data-drag-row]'))
  if (!rows.length) return null

  const tops = rows.map((row) => row.getBoundingClientRect().top)
  const heights = rows.map((row) => row.getBoundingClientRect().height)
  const gap =
    rows.length > 1
      ? Math.max(0, tops[1] - tops[0] - heights[0])
      : 0

  return { tops, heights, gap }
}

function computeHoverIndex(clientY: number, metrics: RowMetrics): number {
  for (let i = 0; i < metrics.tops.length; i++) {
    const mid = metrics.tops[i] + metrics.heights[i] / 2
    if (clientY < mid) return i
  }
  return metrics.tops.length - 1
}

function getRowShift(
  idx: number,
  dragIndex: number,
  hoverIndex: number,
  metrics: RowMetrics,
): number {
  if (dragIndex === hoverIndex) return 0

  const slotSize = metrics.heights[dragIndex] + metrics.gap

  if (dragIndex < hoverIndex && idx > dragIndex && idx <= hoverIndex) {
    return -slotSize
  }
  if (dragIndex > hoverIndex && idx >= hoverIndex && idx < dragIndex) {
    return slotSize
  }
  return 0
}

function releasePointerCapture(handle: HTMLElement | null, pointerId: number | null) {
  if (!handle || pointerId == null) return
  try {
    handle.releasePointerCapture(pointerId)
  } catch {
    // already released
  }
}

/**
 * Pointer-based drag-to-reorder for a vertical list. Rows must be rendered
 * inside `listRef` and carry a `data-drag-row` attribute so they can be
 * measured. `keys` provides a stable identity per row (same order as render).
 *
 * Attach `startDrag` to a grip handle on each row (do not long-press the row).
 */
export function useDragReorder({
  keys,
  onReorder,
  disabled = false,
}: {
  keys: string[]
  onReorder: (from: number, to: number) => void
  disabled?: boolean
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const rowMetricsRef = useRef<RowMetrics | null>(null)
  const hoverIndexRef = useRef<number | null>(null)
  const dragStartYRef = useRef(0)
  const dragListenersCleanupRef = useRef<(() => void) | null>(null)
  const capturedHandleRef = useRef<HTMLElement | null>(null)
  const capturedPointerIdRef = useRef<number | null>(null)
  const keysRef = useRef(keys)
  keysRef.current = keys

  const [draggingKey, setDraggingKey] = useState<string | null>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [dragOffset, setDragOffset] = useState(0)

  const clearCapture = () => {
    releasePointerCapture(capturedHandleRef.current, capturedPointerIdRef.current)
    capturedHandleRef.current = null
    capturedPointerIdRef.current = null
  }

  const cleanupDragListeners = () => {
    dragListenersCleanupRef.current?.()
    dragListenersCleanupRef.current = null
  }

  const finishDrag = (rowKey: string | null) => {
    cleanupDragListeners()
    clearCapture()

    if (rowKey) {
      const target = hoverIndexRef.current
      const dragIndex = keysRef.current.findIndex((k) => k === rowKey)
      if (dragIndex >= 0 && target !== null && dragIndex !== target) {
        onReorder(dragIndex, target)
      }
    }

    rowMetricsRef.current = null
    hoverIndexRef.current = null
    setDraggingKey(null)
    setHoverIndex(null)
    setDragOffset(0)
  }

  const attachDragListeners = (rowKey: string, pointerId: number) => {
    cleanupDragListeners()

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      ev.preventDefault()

      const cached = rowMetricsRef.current
      if (!cached) return

      const nextHover = computeHoverIndex(ev.clientY, cached)
      hoverIndexRef.current = nextHover
      setDragOffset(ev.clientY - dragStartYRef.current)
      setHoverIndex(nextHover)
    }

    const onEnd = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      ev.preventDefault()
      finishDrag(rowKey)
    }

    // Window-level listeners keep drag alive when the finger moves over nested
    // inputs/buttons inside the row (critical on mobile).
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onEnd)
    window.addEventListener('pointercancel', onEnd)

    dragListenersCleanupRef.current = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onEnd)
      window.removeEventListener('pointercancel', onEnd)
    }
  }

  const beginDrag = (index: number, pointerId: number, clientY: number) => {
    if (disabled) return

    window.getSelection?.()?.removeAllRanges()

    const metrics = measureRows(listRef.current)
    if (!metrics) {
      clearCapture()
      return
    }

    const rowKey = keysRef.current[index]
    if (!rowKey) {
      clearCapture()
      return
    }

    rowMetricsRef.current = metrics
    dragStartYRef.current = clientY
    hoverIndexRef.current = index
    setDraggingKey(rowKey)
    setHoverIndex(index)
    setDragOffset(0)

    attachDragListeners(rowKey, pointerId)
  }

  const startDrag = (index: number, e: React.PointerEvent<HTMLElement>) => {
    if (disabled) return
    e.preventDefault()
    e.stopPropagation()

    const handle = e.currentTarget
    const pointerId = e.pointerId

    try {
      handle.setPointerCapture(pointerId)
      capturedHandleRef.current = handle
      capturedPointerIdRef.current = pointerId
    } catch {
      // capture may fail on some browsers; window listeners still help
    }

    beginDrag(index, pointerId, e.clientY)
  }

  useEffect(
    () => () => {
      cleanupDragListeners()
      clearCapture()
    },
    [],
  )

  const dragIndex = draggingKey ? keys.findIndex((k) => k === draggingKey) : -1
  const activeHoverIndex = hoverIndex ?? dragIndex
  const rowMetrics = rowMetricsRef.current

  const getRowStyle = (idx: number): CSSProperties | undefined => {
    if (dragIndex < 0 || !rowMetrics) return undefined

    if (idx === dragIndex) {
      return { transform: `translateY(${dragOffset}px)`, zIndex: 10, touchAction: 'none' }
    }

    const shift = getRowShift(idx, dragIndex, activeHoverIndex, rowMetrics)
    if (shift === 0) return undefined
    return { transform: `translateY(${shift}px)` }
  }

  return {
    listRef,
    draggingKey,
    isDragging: draggingKey !== null,
    startDrag,
    getRowStyle,
  }
}

/** Pure helper to reorder an array immutably. */
export function reorderList<T>(list: T[], from: number, to: number): T[] {
  const result = [...list]
  const [moved] = result.splice(from, 1)
  result.splice(to, 0, moved)
  return result
}
