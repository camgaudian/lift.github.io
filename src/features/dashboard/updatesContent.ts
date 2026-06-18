/** Edit this file when you ship updates, then run a command from supabase/scripts/updates_popup_broadcast.sql */

export type UpdateItem = {
  title: string
  description: string
}

export const UPDATES_POPUP = {
  title: "Update 4.4: What's new?",
  main: [
    {
      title: 'Profile photos',
      description:
        'Add or change your picture from your profile. Friends see it on your profile, the PR leaderboard, notifications, and more.',
    },
    {
      title: 'Edit past workouts',
      description:
        'Fix start and end times, add or remove exercises, and update sets on any completed workout.',
    },
    {
      title: 'Upcoming milestones',
      description:
        'Tap any milestone on Progress to see your earned tiers and what you need for the next one.',
    },
  ] satisfies UpdateItem[],
  mainSectionTitle: 'Big changes',
  more: [
    {
      title: 'UI improvements',
      description:
        'More natural motions and animations with a fluid glass-style design, modern sliders, and floating popups!',
    },
    {
      title: 'Bug fixes & QoL',
      description: 'Reliability improvements across workouts and session notes, including confirmation messages, clearer dates, and more.',
    },
  ] satisfies UpdateItem[],
  moreSectionTitle: 'Also in this update',
} as const
