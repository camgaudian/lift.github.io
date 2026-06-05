import { supabase } from '@/lib/supabase'
import type { Exercise, ExerciseType } from '@/lib/types'

export async function fetchExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function createExercise(exercise: {
  name: string
  exercise_type: ExerciseType
  category: string
  primary_muscles: string[]
  equipment?: string
}): Promise<Exercise> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('exercises')
    .insert({ ...exercise, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteExercise(id: string): Promise<void> {
  const { error } = await supabase.from('exercises').delete().eq('id', id)
  if (error) throw error
}
