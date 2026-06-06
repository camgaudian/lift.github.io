import { useRef, useState, type CSSProperties } from 'react'

type RowMetrics = {
  tops: number[]
  heights: number[]
  gap: number
}

function measureRows(container: HTMLElement | null): RowMetrics | null {
  if (!container) return null
  const rows = Array.from(container.querySelectorAll<HTMLElement>('[data-drag-row]'))
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

/**
 * Pointer-based drag-to-reorder for a vertical list. Rows must be rendered
 * inside `listRef` and carry a `data-drag-row` attribute so they can be
 * measured. `keys` provides a stable identity per row (same order as render).
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
  const keysRef = useRef(keys)
  keysRef.current = keys

  const [draggingKey, setDraggingKey] = useState<string | null>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [dragOffset, setDragOffset] = useState(0)

  const finishDrag = (rowKey: string | null) => {
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

  const startDrag = (index: number, e: React.PointerEvent<HTMLElement>) => {
    if (disabled) return
    e.preventDefault()
    e.stopPropagation()

    const handle = e.currentTarget
    handle.setPointerCapture(e.pointerId)

    const metrics = measureRows(listRef.current)
    if (!metrics) return

    const rowKey = keysRef.current[index]
    if (!rowKey) return

    rowMetricsRef.current = metrics
    dragStartYRef.current = e.clientY
    hoverIndexRef.current = index
    setDraggingKey(rowKey)
    setHoverIndex(index)
    setDragOffset(0)

    const onMove = (ev: PointerEvent) => {
      ev.preventDefault()
      const cached = rowMetricsRef.current
      if (!cached) return

      const nextHover = computeHoverIndex(ev.clientY, cached)
      hoverIndexRef.current = nextHover
      setDragOffset(ev.clientY - dragStartYRef.current)
      setHoverIndex(nextHover)
    }

    const onEnd = (ev: PointerEvent) => {
      ev.preventDefault()
      handle.removeEventListener('pointermove', onMove)
      handle.removeEventListener('pointerup', onEnd)
      handle.removeEventListener('pointercancel', onEnd)
      try {
        handle.releasePointerCapture(ev.pointerId)
      } catch {
        // already released
      }
      finishDrag(rowKey)
    }

    handle.addEventListener('pointermove', onMove)
    handle.addEventListener('pointerup', onEnd)
    handle.addEventListener('pointercancel', onEnd)
  }

  const dragIndex = draggingKey ? keys.findIndex((k) => k === draggingKey) : -1
  const activeHoverIndex = hoverIndex ?? dragIndex
  const rowMetrics = rowMetricsRef.current

  const getRowStyle = (idx: number): CSSProperties | undefined => {
    if (dragIndex < 0 || !rowMetrics) return undefined

    if (idx === dragIndex) {
      return { transform: `translateY(${dragOffset}px)`, zIndex: 10 }
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
