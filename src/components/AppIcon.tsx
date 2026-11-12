import { LiftMonogram } from '@/components/LiftMark'

interface AppIconProps {
  size?: number
  color?: string
  className?: string
}

/** Square brand glyph (L monogram), tinted with the user's accent unless `color` is given. */
export function AppIcon({ size = 32, color, className = '' }: AppIconProps) {
  return <LiftMonogram height={size} color={color} className={className} />
}
