import { useState } from 'react'
import { useExercises } from './useExercises'
import { createExercise, deleteExercise } from './exerciseApi'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Card } from '@/components/Card'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Modal } from '@/components/Modal'
import { ShareIcon } from '@/components/ShareIcon'
import { TrashIcon } from '@/components/TrashIcon'
import { FriendPickerModal } from '@/features/sharing/FriendPickerModal'
import { capitalize } from '@/lib/format'
import {
  EXERCISE_CATEGORIES,
  EXERCISE_FILTER_CATEGORIES,
  groupExercisesByCategory,
} from '@/lib/exerciseCategories'
import { iconDeleteButtonClass } from '@/lib/ui'
import type { Exercise, ExerciseType } from '@/lib/types'

const TYPES: ExerciseType[] = ['strength', 'bodyweight', 'cardio']

type ExerciseItem = Pick<
  Exercise,
  'id' | 'name' | 'category' | 'exercise_type' | 'primary_muscles' | 'equipment'
>

export function ExercisesTab() {
  const { exercises, loading, error, reload } = useExercises()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [exerciseType, setExerciseType] = useState<ExerciseType>('strength')
  const [newCategory, setNewCategory] = useState(EXERCISE_CATEGORIES[0])
  const [muscles, setMuscles] = useState('')
  const [equipment, setEquipment] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ExerciseItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [shareTarget, setShareTarget] = useState<ExerciseItem | null>(null)

  const filtered = exercises.filter((e) => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = !category || e.category === category
    return matchSearch && matchCat
  })

  const builtin = filtered.filter((e) => !e.user_id)
  const custom = filtered.filter((e) => e.user_id)

  const handleAdd = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await createExercise({
        name: name.trim(),
        exercise_type: exerciseType,
        category: exerciseType === 'cardio' ? 'cardio' : newCategory,
        primary_muscles: muscles.split(',').map((m) => m.trim()).filter(Boolean),
        equipment: equipment || undefined,
      })
      setName('')
      setMuscles('')
      setEquipment('')
      setShowAdd(false)
      reload()
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteExercise(deleteTarget.id)
      setDeleteTarget(null)
      reload()
    } catch (e) {
      const code = e && typeof e === 'object' && 'code' in e ? String(e.code) : ''
      setDeleteError(
        code === '23503'
          ? 'This exercise is used in workouts or templates and cannot be deleted.'
          : 'Failed to delete exercise.',
      )
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <LoadingSpinner size="section" />
  if (error) return <p className="text-danger">{error}</p>

  return (
    <div className="flex flex-col gap-4">
      <Input
        placeholder="Search exercises…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <select
        className="w-full rounded-xl border border-border bg-surface px-4 py-3 capitalize"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        <option value="">All categories</option>
        {EXERCISE_FILTER_CATEGORIES.map((c) => (
          <option key={c} value={c}>{capitalize(c)}</option>
        ))}
      </select>

      <Button variant="secondary" fullWidth onClick={() => setShowAdd(!showAdd)}>
        {showAdd ? 'Cancel' : '+ Add custom exercise'}
      </Button>

      {showAdd && (
        <Card className="flex flex-col gap-3">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <div>
            <label className="text-sm text-text-secondary">Type</label>
            <select
              className="mt-1 w-full rounded-xl border border-border bg-surface px-4 py-3"
              value={exerciseType}
              onChange={(e) => setExerciseType(e.target.value as ExerciseType)}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>{capitalize(t)}</option>
              ))}
            </select>
          </div>
          {exerciseType !== 'cardio' && (
            <div>
              <label className="text-sm text-text-secondary">Category</label>
              <select
                className="mt-1 w-full rounded-xl border border-border bg-surface px-4 py-3"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as typeof newCategory)}
              >
                {EXERCISE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{capitalize(c)}</option>
                ))}
              </select>
            </div>
          )}
          <Input label="Muscles (comma-separated)" value={muscles} onChange={(e) => setMuscles(e.target.value)} />
          <Input label="Equipment" value={equipment} onChange={(e) => setEquipment(e.target.value)} />
          <Button onClick={handleAdd} disabled={saving} fullWidth>Save exercise</Button>
        </Card>
      )}

      {custom.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-medium text-text-secondary">Your exercises</h3>
          <GroupedExerciseList
            groups={groupExercisesByCategory(custom)}
            showGroupHeaders={!category}
            onDeleteRequest={(exercise) => {
              setDeleteError(null)
              setDeleteTarget(exercise)
            }}
            onShareRequest={setShareTarget}
          />
        </section>
      )}

      <section>
        <h3 className="mb-2 text-sm font-medium text-text-secondary">Built-in</h3>
        <GroupedExerciseList groups={groupExercisesByCategory(builtin)} showGroupHeaders={!category} />
      </section>

      {deleteTarget && (
        <Modal title="Delete exercise?" onClose={() => !deleting && setDeleteTarget(null)}>
          <p className="text-sm text-text-secondary">
            Permanently delete <span className="font-medium text-text">{deleteTarget.name}</span>?
            This cannot be undone.
          </p>
          {deleteError && <p className="mt-2 text-sm text-danger text-center">{deleteError}</p>}
          <div className="mt-5 flex gap-2">
            <Button
              variant="secondary"
              fullWidth
              disabled={deleting}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button variant="danger" fullWidth disabled={deleting} onClick={confirmDelete}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </Modal>
      )}

      {shareTarget && (
        <FriendPickerModal
          kind="exercise"
          itemId={shareTarget.id}
          itemName={shareTarget.name}
          onClose={() => setShareTarget(null)}
        />
      )}
    </div>
  )
}

function GroupedExerciseList({
  groups,
  showGroupHeaders,
  onDeleteRequest,
  onShareRequest,
}: {
  groups: { category: string; items: ExerciseItem[] }[]
  showGroupHeaders: boolean
  onDeleteRequest?: (exercise: ExerciseItem) => void
  onShareRequest?: (exercise: ExerciseItem) => void
}) {
  if (groups.length === 0) {
    return <p className="text-sm text-text-secondary">No exercises found.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map(({ category, items }) => (
        <section key={category}>
          {showGroupHeaders && (
            <h4 className="mb-2 text-sm font-semibold capitalize">{category}</h4>
          )}
          <ExerciseList
            items={items}
            onDeleteRequest={onDeleteRequest}
            onShareRequest={onShareRequest}
          />
        </section>
      ))}
    </div>
  )
}

function ExerciseList({
  items,
  onDeleteRequest,
  onShareRequest,
}: {
  items: ExerciseItem[]
  onDeleteRequest?: (exercise: ExerciseItem) => void
  onShareRequest?: (exercise: ExerciseItem) => void
}) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((e) => (
        <li key={e.id}>
          <Card padding="sm" className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium truncate">{e.name}</p>
              <p className="text-xs text-text-secondary capitalize">
                {e.exercise_type}
                {e.equipment ? ` · ${e.equipment}` : ''}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              {onShareRequest && (
                <button
                  type="button"
                  onClick={() => onShareRequest(e)}
                  className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface-secondary hover:text-accent"
                  aria-label={`Share ${e.name}`}
                >
                  <ShareIcon />
                </button>
              )}
              {onDeleteRequest && (
                <button
                  type="button"
                  onClick={() => onDeleteRequest(e)}
                  className={iconDeleteButtonClass}
                  aria-label={`Delete ${e.name}`}
                >
                  <TrashIcon />
                </button>
              )}
            </div>
          </Card>
        </li>
      ))}
    </ul>
  )
}
