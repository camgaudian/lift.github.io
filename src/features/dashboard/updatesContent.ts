/**
 * Edit this file when you ship updates, then bump UPDATES_POPUP_VERSION.
 * No Supabase broadcast is needed — clients show the popup when their
 * last_seen_updates_version is behind this number (see migration 011).
 *
 * Old app builds only dismiss against their own baked-in version, so they
 * cannot "consume" a newer announcement before the code update arrives.
 */

export type UpdateItemIcon =
  | 'push'
  | 'collapse'
  | 'swap'
  | 'reuse'
  | 'privacy'
  | 'leaderboard'
  | 'library'

export type UpdateItem = {
  title: string
  description: string
  icon: UpdateItemIcon
}

/** Bump this whenever UPDATES_POPUP copy changes. */
export const UPDATES_POPUP_VERSION = 5

export const UPDATES_POPUP = {
  title: "Update 4.5: What's new?",
  main: [
    {
      icon: 'push',
      title: 'Push notifications',
      description:
        'Get alerts for friend requests, shares, and unfinished workouts, even when Lift is closed. Customize what you receive in Settings.',
    },
    {
      icon: 'collapse',
      title: 'Collapse finished exercises',
      description:
        'Tap the collapse control on an exercise when finished to tuck it away. Expand anytime to edit sets again.',
    },
    {
      icon: 'swap',
      title: 'Swap exercises',
      description:
        'Replace an exercise mid-workout or in a template with the swap control. No more rebuild hassles!',
    },
    {
      icon: 'reuse',
      title: 'Reuse last set',
      description:
        'Tap the reuse control on a set to fill in your previous session’s weight and reps in one tap.',
    },
  ] satisfies UpdateItem[],
  mainSectionTitle: 'Big changes',
  more: [
    {
      icon: 'privacy',
      title: 'Hide PR data from friends',
      description:
        'Opt out of the PR leaderboard and exercise rankings in Settings → Preferences.',
    },
    {
      icon: 'leaderboard',
      title: 'PR leaderboard refresh',
      description:
        'A whole new look, including a podium for your top exercises!',
    },
    {
      icon: 'library',
      title: 'Bigger exercise library',
      description: 'Dozens more built-in exercises, plus workout polish and bug fixes.',
    },
  ] satisfies UpdateItem[],
  moreSectionTitle: 'Also in this update',
} as const
