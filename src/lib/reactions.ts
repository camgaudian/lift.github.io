// Allowed now-playing reaction emojis. Must stay in sync with the CHECK
// constraint and RPC validation in supabase/migrations/017_now_playing_reactions.sql.
export const REACTION_EMOJIS = ['🔥', '💪', '🎵', '❤️', '😂', '🤘'] as const

export type ReactionEmoji = (typeof REACTION_EMOJIS)[number]

export function isReactionEmoji(value: string): value is ReactionEmoji {
  return (REACTION_EMOJIS as readonly string[]).includes(value)
}
