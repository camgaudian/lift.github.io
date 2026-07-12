import { useTheme } from '@/contexts/ThemeContext'

export const sectionHeadingBase =
  'px-1 text-xs font-semibold uppercase tracking-wide'

export const sectionHeadingClass = `${sectionHeadingBase} text-text-secondary`

/** Primary text when Color Pop is on; otherwise the default muted/accent class. */
export function useColorPopText(defaultClass: string): string {
  const { colorPop } = useTheme()
  return colorPop ? 'text-text' : defaultClass
}

export function useSectionHeadingClass(): string {
  const { colorPop } = useTheme()
  return `${sectionHeadingBase} ${colorPop ? 'text-text' : 'text-text-secondary'}`
}

export const iconDeleteButtonClass =
  'shrink-0 rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface-secondary hover:text-danger'

export const iconToolbarButtonClass =
  'shrink-0 rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface-secondary'

export const backButtonClass =
  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text'

/**
 * Quarter-circle button anchored to the bottom-left or bottom-right corner of a
 * `relative overflow-hidden` container. The square box has one corner rounded to
 * a full circle, which — combined with the container clipping the sharp tip to
 * match its own corner radius — renders as a wedge flush with the container edge.
 */
export function cornerButtonClass(
  position: 'left' | 'right',
  hover: 'accent' | 'danger' = 'accent',
): string {
  return [
    'absolute bottom-0 z-10 flex h-14 w-14 items-end text-text-secondary transition-colors',
    'bg-surface-secondary/70 hover:bg-surface-secondary',
    hover === 'danger' ? 'hover:text-danger' : 'hover:text-accent',
    position === 'left'
      ? 'left-0 justify-start rounded-tr-full pb-3 pl-3'
      : 'right-0 justify-end rounded-tl-full pb-3 pr-3',
  ].join(' ')
}

export const trackTextFadeClass =
  'overflow-hidden whitespace-nowrap [mask-image:linear-gradient(to_right,black_calc(100%-1.25rem),transparent)] [-webkit-mask-image:linear-gradient(to_right,black_calc(100%-1.25rem),transparent)]'
