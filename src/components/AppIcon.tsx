import { useTheme } from '@/contexts/ThemeContext'
import { DEFAULT_ACCENT } from '@/lib/theme'

interface AppIconProps {
  size?: number
  color?: string
  className?: string
}

export function AppIcon({ size = 32, color = DEFAULT_ACCENT, className = '' }: AppIconProps) {
  const { theme } = useTheme()
  const barbellColor = theme === 'dark' ? '#000000' : '#ffffff'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path d="M18.5 14 C9 14 9 30.5 21 31.5" fill="none" stroke={color} strokeWidth="3.4" />
      <path d="M45.5 14 C55 14 55 30.5 43 31.5" fill="none" stroke={color} strokeWidth="3.4" />
      <path d="M18 11 H46 V22 C46 34 38.5 41 32 41 C25.5 41 18 34 18 22 Z" fill={color} />
      <rect x="29" y="40" width="6" height="7" fill={color} />
      <path d="M22 54 H42 L39 47 H25 Z" fill={color} />
      <rect x="19.5" y="53.5" width="25" height="4.5" rx="1.8" fill={color} />
      <g stroke={barbellColor} strokeWidth="2.8" strokeLinecap="round" opacity="0.95">
        <line x1="26.5" y1="23" x2="37.5" y2="23" />
        <line x1="24" y1="19" x2="24" y2="27" />
        <line x1="40" y1="19" x2="40" y2="27" />
      </g>
    </svg>
  )
}
