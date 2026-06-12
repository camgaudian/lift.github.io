// Allowed now-playing reaction emojis. Must stay in sync with the CHECK
// constraint in 001_schema.sql and react_to_now_playing in 004_functions.sql.
export const REACTION_EMOJIS = ['🔥', '💪', '🗣️', '💔', '💀', '😩'] as const

export type ReactionEmoji = (typeof REACTION_EMOJIS)[number]

export function isReactionEmoji(value: string): value is ReactionEmoji {
  return (REACTION_EMOJIS as readonly string[]).includes(value)
}
