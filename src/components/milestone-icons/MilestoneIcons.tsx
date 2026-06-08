import type { CSSProperties } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { getMilestoneShortLabel, type MilestoneCategoryId } from '@/lib/milestones'

interface MilestoneIconProps {
  category: MilestoneCategoryId
  /** 0–6 visual tier; use -1 for locked / not yet achieved */
  tier: number
  size?: number
  className?: string
  accentColor?: string
}

const BORDER_WIDTH = 3

/**
 * Vertical gap between the glyph and achievement label, as a multiple of `size`.
 * Negative = pull the label up; positive = push it down.
 * Tune these per category to keep the icon + number group visually centered.
 */
const LABEL_MARGIN_TOP_MULTIPLIERS: Record<MilestoneCategoryId, number> = {
  weight: -0.08,
  workouts: 0.02,
  sets: -0.06,
  reps: -0.08,
  cardio: -0.08,
  streak: -0.1,
}

/** Scale factor for the glyph SVG, relative to the default `size * 0.8`. */
const ICON_SIZE_MULTIPLIERS: Record<MilestoneCategoryId, number> = {
  weight: 1.1,
  workouts: 0.9,
  sets: 1.1,
  reps: 1.1,
  cardio: 1,
  streak: 1,
}

/**
 * Shift the icon + label group up/down together, as a multiple of `size`.
 * Negative = move both up; positive = move both down.
 */
const CONTENT_OFFSET_MULTIPLIERS: Record<MilestoneCategoryId, number> = {
  weight: -0.12,
  workouts: -0.02,
  sets: -0.1,
  reps: -0.08,
  cardio: -0.08,
  streak: -0.04,
}

const METAL_GRADIENTS: Record<'bronze' | 'silver' | 'gold', string> = {
  bronze:
    'repeating-linear-gradient(115deg, rgba(255,255,255,0.16) 0 1px, transparent 1px 4px), linear-gradient(135deg, #7a3f1d 0%, #cd7f32 24%, #f4c79b 45%, #cd7f32 60%, #8a4b2a 80%, #e0a06a 100%)',
  silver:
    'repeating-linear-gradient(115deg, rgba(255,255,255,0.2) 0 1px, transparent 1px 4px), linear-gradient(135deg, #7d7f81 0%, #c8cacb 22%, #ffffff 45%, #bcbec0 62%, #8a8d8f 82%, #e8eaeb 100%)',
  gold:
    'repeating-linear-gradient(115deg, rgba(255,255,255,0.18) 0 1px, transparent 1px 4px), linear-gradient(135deg, #9c6f12 0%, #d4af37 24%, #fbef9b 46%, #e7c44d 62%, #a87f17 82%, #f3df7d 100%)',
}

type TierStyle =
  | { kind: 'none' }
  | { kind: 'accent'; opacityPct: number }
  | { kind: 'metal'; metal: 'bronze' | 'silver' | 'gold' }

function getTierStyle(tier: number): TierStyle {
  switch (tier) {
    case 0:
      return { kind: 'none' }
    case 1:
      return { kind: 'accent', opacityPct: 10 }
    case 2:
      return { kind: 'accent', opacityPct: 45 }
    case 3:
      return { kind: 'accent', opacityPct: 80 }
    case 4:
      return { kind: 'metal', metal: 'bronze' }
    case 5:
      return { kind: 'metal', metal: 'silver' }
    case 6:
      return { kind: 'metal', metal: 'gold' }
    default:
      return { kind: 'none' }
  }
}

export function MilestoneIcon({
  category,
  tier,
  size = 44,
  className = '',
  accentColor: accentColorOverride,
}: MilestoneIconProps) {
  const { accentColor: themeAccentColor } = useTheme()
  const accentColor = accentColorOverride ?? themeAccentColor
  const visualTier = Math.max(0, Math.min(6, tier))
  const locked = tier < 0
  const shiny = !locked && visualTier >= 3
  const tierStyle: TierStyle = locked ? { kind: 'none' } : getTierStyle(visualTier)
  const displayLabel = locked ? 'Locked' : getMilestoneShortLabel(category, visualTier)

  const boxSize = Math.round(size * 1.6)
  const iconSize = Math.round(size * 0.8 * ICON_SIZE_MULTIPLIERS[category])
  const innerRadius = Math.round(size * 0.28)
  const outerRadius = innerRadius + BORDER_WIDTH

  // Prominent label that scales down for longer strings (e.g. "250K") so it
  // always stays within the frame. "." takes less horizontal space than a digit.
  const labelCharUnits =
    [...displayLabel].reduce((n, ch) => n + (ch === '.' ? 0.45 : 1), 0) || 1
  const maxLabelFont = locked ? size * 0.28 : size * 0.46
  const widthLabelFont = (boxSize * 0.72) / (labelCharUnits * 0.62)
  const labelFontSize = Math.max(9, Math.min(maxLabelFont, widthLabelFont))
  const labelMarginTop = size * LABEL_MARGIN_TOP_MULTIPLIERS[category]
  const contentOffsetY = size * CONTENT_OFFSET_MULTIPLIERS[category]

  const hasBorder = tierStyle.kind !== 'none'

  const outerStyle: CSSProperties = {
    borderRadius: outerRadius,
    padding: hasBorder ? BORDER_WIDTH : 0,
  }
  let metalClass = ''

  if (tierStyle.kind === 'accent') {
    outerStyle.background = `color-mix(in srgb, ${accentColor} ${tierStyle.opacityPct}%, transparent)`
  } else if (tierStyle.kind === 'metal') {
    outerStyle.background = METAL_GRADIENTS[tierStyle.metal]
    metalClass = 'milestone-metal'
  }

  const iconColor = locked ? 'var(--color-text-secondary)' : accentColor

  return (
    <div className={['block', className].join(' ')} style={outerStyle}>
      <div
        className={[
          'relative flex flex-col items-center justify-center overflow-hidden bg-surface-secondary',
          metalClass,
        ].join(' ')}
        style={{ borderRadius: innerRadius, width: boxSize, height: boxSize }}
      >
        {!locked && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center font-bold leading-none select-none"
            style={{
              color: iconColor,
              opacity: 0.12,
              fontSize: size * 1.7,
              transform: `translateY(${size * -0.1}px)`,
            }}
          >
            {visualTier + 1}
          </span>
        )}
        <div
          className="relative flex flex-col items-center"
          style={{ transform: `translateY(${contentOffsetY}px)` }}
        >
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 48 48"
            fill="none"
            aria-hidden
            className={['relative', locked ? 'opacity-40' : ''].join(' ')}
            style={{ display: 'block', color: iconColor }}
          >
            <BaseIcon category={category} locked={locked} shiny={shiny} />
          </svg>
          {displayLabel && (
            <span
              className={['relative leading-none select-none', locked ? 'font-medium' : 'font-bold'].join(' ')}
              style={{
                color: iconColor,
                fontSize: labelFontSize,
                marginTop: labelMarginTop,
                letterSpacing: locked ? '0' : '-0.02em',
                whiteSpace: 'nowrap',
                opacity: locked ? 0.7 : 1,
              }}
            >
              {displayLabel}
            </span>
          )}
        </div>
        {shiny && <span className="milestone-shine" />}
      </div>
    </div>
  )
}

function BaseIcon({
  category,
  locked,
  shiny,
}: {
  category: MilestoneCategoryId
  locked: boolean
  shiny: boolean
}) {
  const strokeWidth = locked ? 1.5 : 2
  const stroke = 'currentColor'
  const fill = shiny ? 'currentColor' : 'none'
  const fillOpacity = shiny ? 0.14 : 0
  const props: BaseIconProps = { stroke, fill, fillOpacity, strokeWidth }

  switch (category) {
    case 'weight':
      return <BarbellIcon {...props} />
    case 'workouts':
      return <CalendarIcon {...props} />
    case 'sets':
      return <PlateStackIcon {...props} />
    case 'reps':
      return <TallyIcon {...props} />
    case 'cardio':
      return <PulseIcon {...props} />
    case 'streak':
      return <FlameIcon {...props} />
  }
}

interface BaseIconProps {
  stroke: string
  fill: string
  fillOpacity: number
  strokeWidth: number
}

function BarbellIcon({ stroke, fill, fillOpacity, strokeWidth }: BaseIconProps) {
  return (
    <g>
      <rect x="8" y="19" width="5" height="12" rx="1.5" stroke={stroke} strokeWidth={strokeWidth} fill={fill} fillOpacity={fillOpacity} />
      <rect x="35" y="19" width="5" height="12" rx="1.5" stroke={stroke} strokeWidth={strokeWidth} fill={fill} fillOpacity={fillOpacity} />
      <rect x="13" y="22" width="22" height="6" rx="1.5" stroke={stroke} strokeWidth={strokeWidth} fill={fill} fillOpacity={fillOpacity} />
    </g>
  )
}

function CalendarIcon({ stroke, fill, fillOpacity, strokeWidth }: BaseIconProps) {
  return (
    <g>
      <rect x="10" y="11" width="28" height="28" rx="3" stroke={stroke} strokeWidth={strokeWidth} fill={fill} fillOpacity={fillOpacity} />
      <path d="M10 19h28" stroke={stroke} strokeWidth={strokeWidth} />
      <path d="M17 8v6M31 8v6" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M18 27l3 3 6-6" stroke={stroke} strokeWidth={strokeWidth + 0.25} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  )
}

function PlateStackIcon({ stroke, fill, fillOpacity, strokeWidth }: BaseIconProps) {
  return (
    <g>
      <ellipse cx="24" cy="32" rx="11" ry="4" stroke={stroke} strokeWidth={strokeWidth} fill={fill} fillOpacity={fillOpacity} />
      <ellipse cx="24" cy="26" rx="10" ry="3.5" stroke={stroke} strokeWidth={strokeWidth} fill={fill} fillOpacity={fillOpacity} />
      <ellipse cx="24" cy="20" rx="9" ry="3" stroke={stroke} strokeWidth={strokeWidth} fill={fill} fillOpacity={fillOpacity} />
    </g>
  )
}

function TallyIcon({ stroke, strokeWidth }: BaseIconProps) {
  const lines = [18, 22, 26, 30]
  return (
    <g stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round">
      {lines.map((x) => (
        <line key={x} x1={x} y1="14" x2={x} y2="34" />
      ))}
      <line x1="15" y1="34" x2="33" y2="16" />
    </g>
  )
}

function PulseIcon({ stroke, strokeWidth }: BaseIconProps) {
  return (
    <path
      d="M6 24h7l3-8 5 16 4-12 3 6h14"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  )
}

function FlameIcon({ stroke, fill, fillOpacity, strokeWidth }: BaseIconProps) {
  return (
    <path
      d="M24 6
         C26 13 33 16 33 25
         C33 31 29 35 24 35
         C19 35 15 31 15 25
         C15 21 17 19 19 18
         C19 21 21 22 22 22
         C22 17 22 11 24 6
         Z"
      stroke={stroke}
      strokeWidth={strokeWidth}
      fill={fill}
      fillOpacity={fillOpacity}
      strokeLinejoin="round"
    />
  )
}
