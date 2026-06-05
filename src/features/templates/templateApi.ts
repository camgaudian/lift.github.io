import { supabase } from '@/lib/supabase'
import type { TemplateExercise, WorkoutTemplate } from '@/lib/types'

export async function fetchTemplates(): Promise<WorkoutTemplate[]> {
  const { data, error } = await supabase
    .from('workout_templates')
    .select('*')
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function fetchTemplateWithExercises(templateId: string) {
  const { data: template, error: tErr } = await supabase
    .from('workout_templates')
    .select('*')
    .eq('id', templateId)
    .single()
  if (tErr) throw tErr

  const { data: items, error: iErr } = await supabase
    .from('template_exercises')
    .select('*, exercise:exercises(*)')
    .eq('template_id', templateId)
    .order('sort_order')
  if (iErr) throw iErr

  return { template, exercises: (items ?? []) as TemplateExercise[] }
}

export async function createTemplate(name: string): Promise<WorkoutTemplate> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('workout_templates')
    .insert({ name, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('workout_templates').delete().eq('id', id)
  if (error) throw error
}

export async function addExerciseToTemplate(
  templateId: string,
  exerciseId: string,
  sortOrder: number,
): Promise<void> {
  const { error } = await supabase.from('template_exercises').insert({
    template_id: templateId,
    exercise_id: exerciseId,
    sort_order: sortOrder,
  })
  if (error) throw error
}

export async function removeExerciseFromTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('template_exercises').delete().eq('id', id)
  if (error) throw error
}
