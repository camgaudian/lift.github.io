import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  fetchTemplateWithExercises,
  addExerciseToTemplate,
  removeExerciseFromTemplate,
} from './templateApi'
import { useExercises } from '@/features/exercises/useExercises'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import type { TemplateExercise } from '@/lib/types'

export function TemplateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { exercises } = useExercises()
  const [name, setName] = useState('')
  const [items, setItems] = useState<TemplateExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedExercise, setSelectedExercise] = useState('')
  const [showPicker, setShowPicker] = useState(false)

  const reload = async () => {
    if (!id) return
    setLoading(true)
    try {
      const { template, exercises: ex } = await fetchTemplateWithExercises(id)
      setName(template.name)
      setItems(ex)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [id])

  const handleAddExercise = async () => {
    if (!id || !selectedExercise) return
    await addExerciseToTemplate(id, selectedExercise, items.length)
    setSelectedExercise('')
    setShowPicker(false)
    reload()
  }

  const handleRemove = async (itemId: string) => {
    await removeExerciseFromTemplate(itemId)
    reload()
  }

  if (loading) return <p className="text-text-secondary">Loading…</p>

  const alreadyAdded = new Set(items.map((i) => i.exercise_id))

  return (
    <div className="flex flex-col gap-4">
      <Link to="/library" className="text-sm text-accent">← Library</Link>
      <h1 className="text-2xl font-semibold">{name}</h1>

      <Button fullWidth onClick={() => navigate(`/workout?template=${id}`)}>
        Start workout from template
      </Button>

      <Button variant="secondary" fullWidth onClick={() => setShowPicker(!showPicker)}>
        {showPicker ? 'Cancel' : '+ Add exercise'}
      </Button>

      {showPicker && (
        <Card className="flex flex-col gap-2">
          <select
            className="w-full rounded-xl border border-border bg-surface px-4 py-3"
            value={selectedExercise}
            onChange={(e) => setSelectedExercise(e.target.value)}
          >
            <option value="">Select exercise…</option>
            {exercises
              .filter((e) => !alreadyAdded.has(e.id))
              .map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
          </select>
          <Button onClick={handleAddExercise} disabled={!selectedExercise}>Add</Button>
        </Card>
      )}

      <ul className="flex flex-col gap-2">
        {items.map((item, idx) => (
          <li key={item.id}>
            <Card padding="sm" className="flex justify-between items-center">
              <span>
                {idx + 1}. {(item.exercise as { name: string } | undefined)?.name ?? 'Exercise'}
              </span>
              <button type="button" onClick={() => handleRemove(item.id)} className="text-sm text-danger">
                Remove
              </button>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  )
}
