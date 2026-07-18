import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { formatVolume } from '@/lib/format'
import type { WeightUnit, WeeklyVolume } from '@/lib/types'

interface WeeklyVolumeChartProps {
  data: WeeklyVolume[]
  unit: WeightUnit
  accentColor: string
}

function weekRangeLabel(weekStart: string): string {
  const start = parseISO(weekStart)
  return `Week of ${format(start, 'MMM d')}`
}

function formatDelta(current: number, previous: number | undefined): {
  text: string
  tone: 'up' | 'down' | 'flat' | 'none'
} | null {
  if (previous === undefined) return null
  if (previous === 0 && current === 0) {
    return { text: 'Same as prior week', tone: 'flat' }
  }
  if (previous === 0) {
    return { text: 'New volume this week', tone: 'up' }
  }
  const pct = ((current - previous) / previous) * 100
  if (Math.abs(pct) < 0.5) {
    return { text: 'Same as prior week', tone: 'flat' }
  }
  const rounded = Math.abs(pct) >= 10 ? Math.round(pct) : Math.round(pct * 10) / 10
  if (pct > 0) {
    return { text: `↑ ${rounded}% vs prior week`, tone: 'up' }
  }
  return { text: `↓ ${Math.abs(rounded)}% vs prior week`, tone: 'down' }
}

export function WeeklyVolumeChart({ data, unit, accentColor }: WeeklyVolumeChartProps) {
  const [selectedIndex, setSelectedIndex] = useState(() => Math.max(0, data.length - 1))

  if (data.length === 0) return null

  const selected = data[selectedIndex] ?? data[data.length - 1]
  const previous = selectedIndex > 0 ? data[selectedIndex - 1] : undefined
  const delta = formatDelta(selected.volume_lb, previous?.volume_lb)
  const maxVolume = Math.max(...data.map((w) => w.volume_lb), 1)
  const avgVolume = data.reduce((sum, w) => sum + w.volume_lb, 0) / data.length
  const avgPct = Math.min(100, (avgVolume / maxVolume) * 100)
  const isLatest = selectedIndex === data.length - 1

  const mutedFill = `${accentColor}33`
  const selectedFill = accentColor

  return (
    <div className="select-none [-webkit-touch-callout:none]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-secondary">Weekly volume</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
            {formatVolume(selected.volume_lb, unit)}
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            {isLatest ? 'This week' : weekRangeLabel(selected.week_start)}
            {delta && (
              <>
                <span className="mx-1.5 text-border">·</span>
                <span
                  className={
                    delta.tone === 'up'
                      ? 'text-success'
                      : delta.tone === 'down'
                        ? 'text-danger'
                        : undefined
                  }
                >
                  {delta.text}
                </span>
              </>
            )}
          </p>
        </div>
        <div className="shrink-0 pt-0.5 text-right">
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">
            12-wk avg
          </p>
          <p className="mt-1 text-sm font-semibold tabular-nums text-text">
            {formatVolume(avgVolume, unit)}
          </p>
        </div>
      </div>

      <div
        className="relative h-36 touch-manipulation"
        role="listbox"
        aria-label="Weekly volume for the last 12 weeks"
        aria-activedescendant={`week-bar-${selectedIndex}`}
      >
        {avgVolume > 0 && (
          <div
            className="pointer-events-none absolute inset-x-0 z-0 border-t border-dashed border-border/80"
            style={{ bottom: `${avgPct}%` }}
            aria-hidden
          />
        )}

        <div className="relative z-10 flex h-full items-end gap-1.5">
          {data.map((week, index) => {
            const heightPct =
              week.volume_lb <= 0
                ? 0
                : Math.max(6, (week.volume_lb / maxVolume) * 100)
            const active = index === selectedIndex

            return (
              <button
                key={week.week_start}
                id={`week-bar-${index}`}
                type="button"
                role="option"
                aria-selected={active}
                aria-label={`${weekRangeLabel(week.week_start)}: ${formatVolume(week.volume_lb, unit)}`}
                onClick={() => setSelectedIndex(index)}
                className="relative flex h-full min-w-0 flex-1 items-end justify-center rounded-md outline-none transition-transform active:scale-[0.97]"
              >
                <span
                  className="w-full max-w-[20px] rounded-md transition-[height,background-color] duration-200 ease-out"
                  style={{
                    height: heightPct > 0 ? `${heightPct}%` : '3px',
                    backgroundColor: active
                      ? selectedFill
                      : week.volume_lb > 0
                        ? mutedFill
                        : `${accentColor}18`,
                  }}
                />
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-2 flex gap-1.5" aria-hidden>
        {data.map((week, index) => {
          const active = index === selectedIndex
          const start = parseISO(week.week_start)

          return (
            <div key={week.week_start} className="min-w-0 flex-1 text-center">
              <span
                className={[
                  'flex flex-col items-center gap-0.5 text-[9px] leading-none tabular-nums',
                  active ? 'font-semibold text-text' : 'text-text-secondary',
                ].join(' ')}
              >
                <span>{format(start, 'MMM')}</span>
                <span>{format(start, 'd')}</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
