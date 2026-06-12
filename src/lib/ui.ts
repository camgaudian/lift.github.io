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

export const trackTextFadeClass =
  'overflow-hidden whitespace-nowrap [mask-image:linear-gradient(to_right,black_calc(100%-1.25rem),transparent)] [-webkit-mask-image:linear-gradient(to_right,black_calc(100%-1.25rem),transparent)]'
