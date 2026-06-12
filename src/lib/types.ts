export type ExerciseType = 'strength' | 'bodyweight' | 'cardio'
export type WorkoutStatus = 'in_progress' | 'completed'

export type ThemeMode = 'light' | 'dark'
export type WeightUnit = 'lb' | 'kg'

export type MilestoneCategoryId =
  | 'weight'
  | 'workouts'
  | 'sets'
  | 'reps'
  | 'cardio'
  | 'streak'

export interface Profile {
  id: string
  display_name: string | null
  unit_preference: WeightUnit
  theme: ThemeMode
  accent_color: string
  color_pop: boolean
  hide_add_friend_warning: boolean
  featured_milestone_category: MilestoneCategoryId | null
  created_at: string
  updated_at: string
}

export interface NowPlaying {
  track_id: string
  title: string
  artist: string
  album_art_url: string | null
  expires_at: string
  // The emoji the current user has left on this track, if any. Only populated
  // for friends' tracks (via get_friend_summary).
  my_reaction?: string | null
}

export interface NowPlayingReaction {
  reactor_id: string
  display_name: string | null
  accent_color: string
  emoji: string
  now_playing?: NowPlaying | null
}

export type ReactToNowPlayingResult =
  | { ok: true; reaction: string | null }
  | { ok: false; error: string }

export interface SpotifySearchTrack {
  track_id: string
  title: string
  artist: string
  album: string
  album_art_url: string | null
}

export interface FriendEntry {
  user_id: string
  display_name: string | null
  accent_color: string
  featured_milestone_category: MilestoneCategoryId | null
  now_playing?: NowPlaying | null
}

export interface PendingFriendRequest {
  request_id: string
  user_id: string
  display_name: string | null
}

export interface FriendSummary {
  friends: FriendEntry[]
  incoming: PendingFriendRequest[]
  outgoing: PendingFriendRequest[]
}

export type SendFriendRequestResult =
  | { ok: true; request_id: string; auto_accepted?: boolean }
  | { ok: false; error: string }

export type ShareKind = 'exercise' | 'template'

export interface ExerciseSharePayload {
  name: string
  exercise_type: ExerciseType
  category: string
  primary_muscles: string[]
  equipment: string | null
}

export interface TemplateSharePayloadExercise extends ExerciseSharePayload {
  is_custom: boolean
  sort_order: number
  target_sets: number | null
  target_reps: number | null
  target_weight_lb: number | null
}

export interface TemplateSharePayload {
  name: string
  exercises: TemplateSharePayloadExercise[]
}

interface NotificationBase {
  id: string
  sender_id: string
  sender_name: string | null
  created_at: string
}

export type NotificationItem =
  | (NotificationBase & { type: 'friend_request'; payload: null })
  | (NotificationBase & { type: 'exercise_share'; payload: ExerciseSharePayload })
  | (NotificationBase & { type: 'template_share'; payload: TemplateSharePayload })

export interface NotificationsResult {
  items: NotificationItem[]
  unread_count: number
}

export type ShareResult = { ok: true } | { ok: false; error: string }

export interface Exercise {
  id: string
  user_id: string | null
  name: string
  exercise_type: ExerciseType
  category: string
  primary_muscles: string[]
  equipment: string | null
  created_at: string
}

export interface WorkoutTemplate {
  id: string
  user_id: string
  name: string
  created_at: string
  updated_at: string
  exercise_names?: string[]
}

export interface TemplateExercise {
  id: string
  template_id: string
  exercise_id: string
  sort_order: number
  target_sets: number | null
  target_reps: number | null
  target_weight_lb: number | null
  exercise?: Exercise
}

export interface Workout {
  id: string
  user_id: string
  template_id: string | null
  status: WorkoutStatus
  started_at: string
  completed_at: string | null
  notes: string | null
  created_at: string
  template?: { id: string; name: string } | null
}

export interface WorkoutExercise {
  id: string
  workout_id: string
  exercise_id: string
  sort_order: number
  exercise_type: ExerciseType
  exercise?: Exercise
  strength_sets?: StrengthSet[]
  cardio_entry?: CardioEntry | null
  session_note?: ExerciseSessionNote | null
}

export interface StrengthSet {
  id?: string
  workout_exercise_id?: string
  set_number: number
  reps: number
  weight_lb: number
  added_weight_lb: number | null
  is_warmup: boolean
}

export interface CardioEntry {
  id?: string
  workout_exercise_id?: string
  duration_seconds: number
  distance_miles: number | null
  calories: number | null
}

export interface ExerciseSessionNote {
  id?: string
  workout_exercise_id?: string
  note_for_next_time: string
}

export interface LastSessionData {
  sets: StrengthSet[]
  note: string
  completed_at: string | null
}

export interface PrLeaderboardEntry {
  exercise_id: string
  exercise_name: string
  exercise_slug: string
  best_weight_lb: number
  best_reps: number
  friend_count: number
}

export interface ExercisePrRankingEntry {
  user_id: string
  display_name: string | null
  accent_color: string
  is_self: boolean
  best_weight_lb: number
  best_reps: number
}

export interface ExercisePrRankings {
  exercise_name: string | null
  rankings: ExercisePrRankingEntry[]
}

export interface FunStats {
  total_workouts: number
  total_sets: number
  total_reps: number
  cumulative_volume_lb: number
  total_cardio_seconds: number
  heaviest_set_lb: number | null
  streak_days: number
}

export interface WorkoutFunStats {
  exercise_count: number
  total_sets: number
  total_reps: number
  volume_lb: number
  total_cardio_seconds: number
  heaviest_set_lb: number | null
}

export interface WeeklyVolume {
  week_start: string
  volume_lb: number
}
