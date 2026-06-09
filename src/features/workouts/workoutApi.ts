import { supabase } from '@/lib/supabase'
import { fetchLastSessionForExercise } from '@/lib/stats'
import { fetchTemplateWithExercises } from '@/features/templates/templateApi'
import type {
  CardioEntry,
  Exercise,
  StrengthSet,
  Workout,
  WorkoutExercise,
  WorkoutStatus,
} from '@/lib/types'

export async function fetchActiveWorkout(): Promise<Workout | null> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('status', 'in_progress')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function fetchWorkout(id: string) {
  const { data: workout, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error

  const { data: exercises, error: exErr } = await supabase
    .from('workout_exercises')
    .select(`
      *,
      exercise:exercises(*),
      strength_sets(*),
      cardio_entry:cardio_entries(*),
      session_note:exercise_session_notes(*)
    `)
    .eq('workout_id', id)
    .order('sort_order')
  if (exErr) throw exErr

  const normalized = (exercises ?? []).map((we) => ({
    ...we,
    strength_sets: (we.strength_sets ?? []).sort(
      (a: StrengthSet, b: StrengthSet) => a.set_number - b.set_number,
    ),
    cardio_entry: Array.isArray(we.cardio_entry) ? we.cardio_entry[0] ?? null : we.cardio_entry,
    session_note: Array.isArray(we.session_note) ? we.session_note[0] ?? null : we.session_note,
  }))

  return { workout, exercises: normalized as WorkoutExercise[] }
}

export async function createWorkout(templateId?: string | null): Promise<Workout> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('workouts')
    .insert({
      user_id: user.id,
      template_id: templateId ?? null,
      status: 'in_progress',
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function startWorkoutFromTemplate(templateId: string): Promise<string> {
  const workout = await createWorkout(templateId)
  const { exercises } = await fetchTemplateWithExercises(templateId)

  for (const item of exercises) {
    const ex = item.exercise as Exercise | undefined
    if (!ex) continue
    await addExerciseToWorkout(workout.id, ex.id, ex.exercise_type, item.sort_order)
  }

  return workout.id
}

export async function startEmptyWorkout(): Promise<string> {
  const workout = await createWorkout()
  return workout.id
}

export async function createCompletedWorkout(startedAt: string, completedAt: string): Promise<Workout> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('workouts')
    .insert({
      user_id: user.id,
      status: 'completed',
      started_at: startedAt,
      completed_at: completedAt,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function addExerciseToWorkout(
  workoutId: string,
  exerciseId: string,
  exerciseType: Exercise['exercise_type'],
  sortOrder?: number,
): Promise<WorkoutExercise> {
  let order = sortOrder
  if (order === undefined) {
    const { count } = await supabase
      .from('workout_exercises')
      .select('*', { count: 'exact', head: true })
      .eq('workout_id', workoutId)
    order = count ?? 0
  }

  const { data, error } = await supabase
    .from('workout_exercises')
    .insert({
      workout_id: workoutId,
      exercise_id: exerciseId,
      exercise_type: exerciseType,
      sort_order: order,
    })
    .select('*, exercise:exercises(*)')
    .single()
  if (error) throw error

  if (exerciseType === 'cardio') {
    await supabase.from('cardio_entries').insert({
      workout_exercise_id: data.id,
      duration_seconds: 0,
    })
  } else {
    await supabase.from('exercise_session_notes').insert({
      workout_exercise_id: data.id,
      note_for_next_time: '',
    })
  }

  return data as WorkoutExercise
}

export async function removeWorkoutExercise(id: string): Promise<void> {
  const { error } = await supabase.from('workout_exercises').delete().eq('id', id)
  if (error) throw error
}

export async function reorderWorkoutExercises(orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from('workout_exercises')
        .update({ sort_order: index })
        .eq('id', id)
        .then(({ error }) => {
          if (error) throw error
        }),
    ),
  )
}

export async function upsertStrengthSets(
  workoutExerciseId: string,
  sets: Omit<StrengthSet, 'id' | 'workout_exercise_id'>[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('strength_sets')
    .delete()
    .eq('workout_exercise_id', workoutExerciseId)
  if (deleteError) throw deleteError

  if (sets.length === 0) return

  const { error } = await supabase.from('strength_sets').insert(
    sets.map((s) => ({
      workout_exercise_id: workoutExerciseId,
      set_number: s.set_number,
      reps: s.reps,
      weight_lb: s.weight_lb,
      added_weight_lb: s.added_weight_lb,
      is_warmup: s.is_warmup,
    })),
  )
  if (error) throw error
}

export async function upsertCardioEntry(
  workoutExerciseId: string,
  entry: Omit<CardioEntry, 'id' | 'workout_exercise_id'>,
): Promise<void> {
  const { error } = await supabase.from('cardio_entries').upsert(
    {
      workout_exercise_id: workoutExerciseId,
      duration_seconds: entry.duration_seconds,
      distance_miles: entry.distance_miles,
      calories: entry.calories,
    },
    { onConflict: 'workout_exercise_id' },
  )
  if (error) throw error
}

export async function upsertSessionNote(workoutExerciseId: string, note: string): Promise<void> {
  const { error } = await supabase.from('exercise_session_notes').upsert(
    {
      workout_exercise_id: workoutExerciseId,
      note_for_next_time: note,
    },
    { onConflict: 'workout_exercise_id' },
  )
  if (error) throw error
}

export async function completeWorkout(id: string): Promise<void> {
  const { error } = await supabase
    .from('workouts')
    .update({ status: 'completed' as WorkoutStatus, completed_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function cancelWorkout(id: string): Promise<void> {
  const { error } = await supabase.from('workouts').delete().eq('id', id)
  if (error) throw error
}

export async function getLastSessionForExercise(exerciseId: string) {
  return fetchLastSessionForExercise(exerciseId)
}

export async function fetchCompletedWorkouts(limit = 100) {
  const { data, error } = await supabase
    .from('workouts')
    .select('*, template:workout_templates(id, name)')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(limit)
  if (error) throw error

  return (data ?? []).map((w) => ({
    ...w,
    template: Array.isArray(w.template) ? w.template[0] ?? null : w.template,
  }))
}
