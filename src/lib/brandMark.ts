/**
 * Geometry for the modular LIFT brand mark.
 * Shared by the in-app logo components and scripts/generate-icons.py (keep in sync).
 * Coordinates live in a 1024×1024 icon canvas.
 */

type Corners = [tl: number, tr: number, br: number, bl: number]

/** Rounded rect path with independent corner radii (quadratic corners). */
function rr(x: number, y: number, w: number, h: number, [a, b, c, d]: Corners): string {
  return (
    `M${x + a} ${y}H${x + w - b}Q${x + w} ${y} ${x + w} ${y + b}` +
    `V${y + h - c}Q${x + w} ${y + h} ${x + w - c} ${y + h}` +
    `H${x + d}Q${x} ${y + h} ${x} ${y + h - d}V${y + a}Q${x} ${y} ${x + a} ${y}Z`
  )
}

/** Full LIFT word: "deep" = L, F body, T stem · "soft" = I, F bar, T bar. */
export const WORDMARK = {
  viewBox: '152 322 728 376',
  deep: [
    rr(160, 330, 100, 360, [34, 34, 0, 96]),
    rr(160, 590, 270, 100, [0, 34, 34, 96]),
    rr(452, 447, 100, 243, [34, 0, 34, 34]),
    rr(452, 447, 168, 85, [34, 34, 30, 0]),
    rr(713, 447, 100, 243, [34, 34, 34, 34]),
  ].join(''),
  soft: [
    rr(330, 330, 100, 238, [64, 22, 22, 22]),
    rr(452, 330, 180, 95, [60, 16, 60, 16]),
    rr(654, 330, 218, 95, [60, 16, 60, 16]),
  ].join(''),
} as const

/** Compact "L" monogram (L + I piece) for small spots. */
export const MONOGRAM = {
  viewBox: '290 240 444 544',
  deep: [rr(300, 250, 150, 524, [50, 50, 0, 140]), rr(300, 624, 424, 150, [0, 50, 50, 140])].join(''),
  soft: rr(482, 250, 242, 342, [120, 30, 30, 30]),
} as const

export { brandShades } from '@/lib/theme'
