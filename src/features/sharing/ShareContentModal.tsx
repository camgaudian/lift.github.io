import { useEffect, useState } from 'react'
import { Button } from '@/components/Button'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { BottomSheet } from '@/components/BottomSheet'
import { fetchExercises } from '@/features/exercises/exerciseApi'
import { fetchTemplates } from '@/features/templates/templateApi'
import { shareExercise, shareTemplate, shareErrorMessage } from '@/features/sharing/sharingApi'
import { formatExercisePreview, formatUsername } from '@/lib/format'
import type { Exercise, FriendEntry, WorkoutTemplate } from '@/lib/types'

type ItemState = { status: 'idle' | 'sharing' | 'shared'; error?: string }

function ShareRow({
  title,
  subtitle,
  state,
  onShare,
}: {
  title: string
  subtitle: string
  state: ItemState
  onShare: () => void
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-secondary">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-text-secondary">{subtitle}</p>
        {state.error && <p className="mt-0.5 text-xs text-danger">{state.error}</p>}
      </div>
      <Button
        size="sm"
        variant={state.status === 'shared' ? 'secondary' : 'primary'}
        disabled={state.status !== 'idle'}
        onClick={onShare}
      >
        {state.status === 'sharing' ? 'Sharing…' : state.status === 'shared' ? 'Shared' : 'Share'}
      </Button>
    </li>
  )
}

export function ShareContentModal({
  friend,
  onClose,
}: {
  friend: FriendEntry
  onClose: () => void
}) {
  const [tab, setTab] = useState<'exercises' | 'templates'>('exercises')
  const [loading, setLoading] = useState(true)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [states, setStates] = useState<Record<string, ItemState>>({})

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([fetchExercises(), fetchTemplates()])
      .then(([ex, tpl]) => {
        if (!active) return
        setExercises(ex.filter((e) => e.user_id))
        setTemplates(tpl)
      })
      .catch(() => {
        if (!active) return
        setExercises([])
        setTemplates([])
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const setState = (id: string, next: ItemState) =>
    setStates((prev) => ({ ...prev, [id]: next }))

  const handleShareExercise = async (exercise: Exercise) => {
    setState(exercise.id, { status: 'sharing' })
    try {
      const result = await shareExercise(friend.user_id, exercise.id)
      if (result.ok) {
        setState(exercise.id, { status: 'shared' })
      } else {
        setState(exercise.id, {
          status: 'idle',
          error: shareErrorMessage(result.error, friend.display_name),
        })
      }
    } catch {
      setState(exercise.id, { status: 'idle', error: 'Failed to share.' })
    }
  }

  const handleShareTemplate = async (template: WorkoutTemplate) => {
    setState(template.id, { status: 'sharing' })
    try {
      const result = await shareTemplate(friend.user_id, template.id)
      if (result.ok) {
        setState(template.id, { status: 'shared' })
      } else {
        setState(template.id, {
          status: 'idle',
          error: shareErrorMessage(result.error, friend.display_name),
        })
      }
    } catch {
      setState(template.id, { status: 'idle', error: 'Failed to share.' })
    }
  }

  const tabClass = (active: boolean) =>
    `flex-1 rounded-lg py-2 text-sm font-medium ${active ? 'bg-surface shadow-sm' : 'text-text-secondary'}`

  return (
    <BottomSheet
      title={`Share with ${formatUsername(friend.display_name)}`}
      onClose={onClose}
      showCloseButton
      scrollable
      accentColor={friend.accent_color}
    >
      <div className="sticky top-0 z-10 bg-surface pb-2">
        <div className="flex rounded-xl bg-surface-secondary p-1">
          <button type="button" onClick={() => setTab('exercises')} className={tabClass(tab === 'exercises')}>
            Exercises
          </button>
          <button type="button" onClick={() => setTab('templates')} className={tabClass(tab === 'templates')}>
            Templates
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="inline" />
        </div>
      ) : tab === 'exercises' ? (
        exercises.length === 0 ? (
          <p className="px-1 py-6 text-sm text-text-secondary text-center">
            You have no custom exercises to share.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {exercises.map((exercise) => (
              <ShareRow
                key={exercise.id}
                title={exercise.name}
                subtitle={`${exercise.exercise_type}${exercise.equipment ? ` · ${exercise.equipment}` : ''}`}
                state={states[exercise.id] ?? { status: 'idle' }}
                onShare={() => handleShareExercise(exercise)}
              />
            ))}
          </ul>
        )
      ) : templates.length === 0 ? (
        <p className="px-1 py-6 text-sm text-text-secondary text-center">
          You have no templates to share.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {templates.map((template) => (
            <ShareRow
              key={template.id}
              title={template.name}
              subtitle={
                template.exercise_names?.length
                  ? formatExercisePreview(template.exercise_names)
                  : 'No exercises yet'
              }
              state={states[template.id] ?? { status: 'idle' }}
              onShare={() => handleShareTemplate(template)}
            />
          ))}
        </ul>
      )}
    </BottomSheet>
  )
}
