// Quick-pick reactions shown in the compact bar. Full Unicode emoji is allowed
// via the searchable in-app picker; server validates length / no whitespace.
export const QUICK_REACTION_EMOJIS = ['🔥', '💪', '🗣️', '💔', '💀', '😩'] as const

/** @deprecated Use QUICK_REACTION_EMOJIS */
export const REACTION_EMOJIS = QUICK_REACTION_EMOJIS

export type QuickReactionEmoji = (typeof QUICK_REACTION_EMOJIS)[number]

/** @deprecated Use QuickReactionEmoji */
export type ReactionEmoji = QuickReactionEmoji

export function isQuickReactionEmoji(value: string): value is QuickReactionEmoji {
  return (QUICK_REACTION_EMOJIS as readonly string[]).includes(value)
}

/** @deprecated Use isQuickReactionEmoji */
export function isReactionEmoji(value: string): value is QuickReactionEmoji {
  return isQuickReactionEmoji(value)
}

/** Client-side guard before calling react_to_now_playing. */
export function isValidReactionEmoji(value: string): boolean {
  if (!value || [...value].length > 16) return false
  if (/[\s\u0000-\u001f\u007f]/.test(value)) return false
  return /\p{Extended_Pictographic}/u.test(value)
}
