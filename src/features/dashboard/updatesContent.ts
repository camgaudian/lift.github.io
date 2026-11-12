/**
 * Edit this file when you ship updates, then bump UPDATES_POPUP_VERSION.
 * No Supabase broadcast is needed — clients show the popup when their
 * last_seen_updates_version is behind this number (see migration 011).
 *
 * Old app builds only dismiss against their own baked-in version, so they
 * cannot "consume" a newer announcement before the code update arrives.
 */

export type UpdateItemIcon =
  | 'brand'
  | 'holiday'
  | 'slide'
  | 'refresh'
  | 'templates'
  | 'milestone'
  | 'delete'
  | 'polish'

export type UpdateItem = {
  title: string
  description: string
  icon: UpdateItemIcon
}

/** Bump this whenever UPDATES_POPUP copy changes. */
export const UPDATES_POPUP_VERSION = 6

export const UPDATES_POPUP = {
  title: "Update 4.6: What's new?",
  main: [
    {
      icon: 'brand',
      title: 'A fresh new look',
      description:
        'A brand-new two-tone Lift logo and app icon, plus refreshed text fields, menus, and switches throughout the app.',
    },
    {
      icon: 'holiday',
      title: 'Holiday themes',
      description:
        'Seasonal decorations for Thanksgiving, Christmas, and New Year’s, all drawn in your color. Turn them off in Settings → Appearance.',
    },
    {
      icon: 'slide',
      title: 'Slide to complete',
      description:
        'Finish a workout with a slide instead of a tap, so no more accidental finishes. Your PRs now roll in with a celebration!',
    },
    {
      icon: 'refresh',
      title: 'Pull to refresh',
      description: 'Pull down from the top of any page to reload your latest data.',
    },
  ] satisfies UpdateItem[],
  mainSectionTitle: 'Big changes',
  more: [
    {
      icon: 'templates',
      title: 'Swipe through templates',
      description: 'Flick through your templates like a deck of cards when starting a workout.',
    },
    {
      icon: 'milestone',
      title: 'Milestone picker',
      description: 'Swipe a carousel to choose which milestone friends see on your profile.',
    },
    {
      icon: 'delete',
      title: 'Safer deletes',
      description: 'Tap once to arm, tap again to confirm when removing exercises and sets.',
    },
    {
      icon: 'polish',
      title: 'Smoother everywhere',
      description: 'New loading animations, progress bars, and lots of small interaction polish.',
    },
  ] satisfies UpdateItem[],
  moreSectionTitle: 'Also in this update',
} as const
