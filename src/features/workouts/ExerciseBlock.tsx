import { useEffect, useState } from 'react'
import { fetchLastSessionForExercise } from '@/lib/stats'
import { formatSetsList } from '@/lib/format'
import type { ExerciseType, LastSessionData, StrengthSet } from '@/lib/types'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Card } from '@/components/Card'
import {
  upsertStrengthSets,
  upsertCardioEntry,
  upsertSessionNote,
  removeWorkoutExercise,
} from './workoutApi'
import { formatDuration, parseDuration } from '@/lib/format'

interface ExerciseBlockProps {
  workoutExerciseId: string
  exerciseId: string
  exerciseName: string
  exerciseType: ExerciseType
  initialSets?: StrengthSet[]
  initialNote?: string
  initialCardio?: { duration_seconds: number; distance_miles: number | null; calories: number | null }
  onRemove?: () => void
  readOnly?: boolean
}

export function ExerciseBlock({
  workoutExerciseId,
  exerciseId,
  exerciseName,
  exerciseType,
  initialSets = [],
  initialNote = '',
  initialCardio,
  onRemove,
  readOnly = false,
}: ExerciseBlockProps) {
  const [lastSession, setLastSession] = useState<LastSessionData | null>(null)
  const [note, setNote] = useState(initialNote)
  const [sets, setSets] = useState<StrengthSet[]>(
    initialSets.length > 0
      ? initialSets
      : [{ set_number: 1, reps: 0, weight_lb: 0, added_weight_lb: null, is_warmup: false }],
  )
  const [duration, setDuration] = useState(
    initialCardio ? formatDuration(initialCardio.duration_seconds) : '20:00',
  )
  const [distance, setDistance] = useState(String(initialCardio?.distance_miles ?? ''))
  const [calories, setCalories] = useState(String(initialCardio?.calories ?? ''))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchLastSessionForExercise(exerciseId).then(setLastSession)
  }, [exerciseId])

  useEffect(() => {
    setNote(initialNote)
  }, [initialNote])

  const lastSetsSummary =
    lastSession?.sets?.length ? formatSetsList(lastSession.sets) : null

  const placeholderFromLast = (setIndex: number, field: 'weight' | 'reps') => {
    const s = lastSession?.sets?.[setIndex]
    if (!s) return undefined
    if (field === 'weight') {
      const w = s.weight_lb + (s.added_weight_lb ?? 0)
      return w > 0 ? String(w) : undefined
    }
    return s.reps > 0 ? String(s.reps) : undefined
  }

  const saveStrength = async () => {
    setSaving(true)
    try {
      await upsertStrengthSets(workoutExerciseId, sets.filter((s) => s.reps > 0))
      await upsertSessionNote(workoutExerciseId, note)
    } finally {
      setSaving(false)
    }
  }

  const saveCardio = async () => {
    setSaving(true)
    try {
      await upsertCardioEntry(workoutExerciseId, {
        duration_seconds: parseDuration(duration),
        distance_miles: distance ? Number(distance) : null,
        calories: calories ? Number(calories) : null,
      })
    } finally {
      setSaving(false)
    }
  }

  const addSet = () => {
    setSets((prev) => [
      ...prev,
      {
        set_number: prev.length + 1,
        reps: 0,
        weight_lb: 0,
        added_weight_lb: null,
        is_warmup: false,
      },
    ])
  }

  const updateSet = (index: number, field: keyof StrengthSet, value: number | boolean | null) => {
    setSets((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    )
  }

  if (exerciseType === 'cardio') {
    return (
      <Card className="flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <h3 className="font-semibold">{exerciseName}</h3>
          {!readOnly && onRemove && (
            <button type="button" onClick={onRemove} className="text-sm text-danger">Remove</button>
          )}
        </div>
        <Input
          label="Duration (mm:ss)"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          disabled={readOnly}
        />
        <Input
          label="Distance (miles)"
          type="number"
          inputMode="decimal"
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
          disabled={readOnly}
        />
        <Input
          label="Calories"
          type="number"
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
          disabled={readOnly}
        />
        {!readOnly && (
          <Button variant="secondary" onClick={saveCardio} disabled={saving}>
            {saving ? 'Saving…' : 'Save cardio'}
          </Button>
        )}
      </Card>
    )
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <h3 className="font-semibold">{exerciseName}</h3>
        {!readOnly && onRemove && (
          <button type="button" onClick={onRemove} className="text-sm text-danger">Remove</button>
        )}
      </div>

      {lastSetsSummary && (
        <p className="text-sm text-text-secondary">
          Last time: <span className="text-text font-medium">{lastSetsSummary}</span>
        </p>
      )}

      {lastSession?.note && (
        <div className="rounded-xl bg-surface-secondary px-3 py-2">
          <p className="text-xs text-text-secondary mb-0.5">Last note</p>
          <p className="text-sm text-text">{lastSession.note}</p>
        </div>
      )}

      {!readOnly && (
        <div>
          <label className="text-sm text-text-secondary">Note for next session</label>
          <textarea
            className="mt-1 w-full rounded-xl border border-border bg-surface px-4 py-3 text-base min-h-[72px] focus:outline-none focus:ring-2 focus:ring-accent/30"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="How did it feel? What to remember?"
          />
        </div>
      )}

      {readOnly && note && (
        <div>
          <p className="text-xs text-text-secondary">Note</p>
          <p className="text-sm">{note}</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {sets.map((set, idx) => (
          <div key={set.set_number} className="flex items-center gap-2">
            <span className="w-8 text-sm text-text-secondary">#{set.set_number}</span>
            {exerciseType === 'bodyweight' ? (
              <>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder={placeholderFromLast(idx, 'reps') ?? 'reps'}
                  value={set.reps || ''}
                  onChange={(e) => updateSet(idx, 'reps', Number(e.target.value))}
                  disabled={readOnly}
                  className="flex-1"
                />
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="added lb"
                  value={set.added_weight_lb ?? ''}
                  onChange={(e) =>
                    updateSet(idx, 'added_weight_lb', e.target.value ? Number(e.target.value) : null)
                  }
                  disabled={readOnly}
                  className="w-24"
                />
              </>
            ) : (
              <>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder={placeholderFromLast(idx, 'weight') ?? 'lb'}
                  value={set.weight_lb || ''}
                  onChange={(e) => updateSet(idx, 'weight_lb', Number(e.target.value))}
                  disabled={readOnly}
                  className="flex-1"
                />
                <span className="text-text-secondary">×</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder={placeholderFromLast(idx, 'reps') ?? 'reps'}
                  value={set.reps || ''}
                  onChange={(e) => updateSet(idx, 'reps', Number(e.target.value))}
                  disabled={readOnly}
                  className="w-20"
                />
              </>
            )}
          </div>
        ))}
      </div>

      {!readOnly && (
        <>
          <Button variant="ghost" onClick={addSet}>+ Add set</Button>
          <Button variant="secondary" onClick={saveStrength} disabled={saving}>
            {saving ? 'Saving…' : 'Save exercise'}
          </Button>
        </>
      )}
    </Card>
  )
}

export async function handleRemoveExercise(workoutExerciseId: string, onDone: () => void) {
  await removeWorkoutExercise(workoutExerciseId)
  onDone()
}
