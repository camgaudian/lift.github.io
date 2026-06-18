import { useEffect, useState } from 'react'

const sizeMap = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-xl',
  xl: 'w-20 h-20 text-2xl',
} as const

type AvatarSize = keyof typeof sizeMap

interface AvatarImageProps {
  avatarUrl?: string | null
  displayName?: string | null
  accentColor?: string
  size?: AvatarSize
  className?: string
}

function getInitials(name: string | null | undefined): string {
  if (!name?.trim()) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function AvatarImage({
  avatarUrl,
  displayName,
  accentColor = '#0071e3',
  size = 'md',
  className = '',
}: AvatarImageProps) {
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    setImgError(false)
  }, [avatarUrl])

  const showImage = Boolean(avatarUrl) && !imgError
  const sizeClass = sizeMap[size]

  const base = `rounded-full shrink-0 select-none overflow-hidden ${sizeClass} ${className}`

  if (showImage) {
    return (
      <img
        src={avatarUrl!}
        alt={displayName ? `${displayName}'s avatar` : 'Avatar'}
        className={`${base} object-cover`}
        onError={() => setImgError(true)}
      />
    )
  }

  return (
    <div
      className={`${base} flex items-center justify-center font-semibold text-white`}
      style={{ backgroundColor: accentColor }}
      aria-label={displayName ? `${displayName}'s avatar` : 'Avatar'}
    >
      {getInitials(displayName)}
    </div>
  )
}
