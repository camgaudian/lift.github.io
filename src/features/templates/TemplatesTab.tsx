import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchTemplates,
  createTemplate,
  deleteTemplate,
} from './templateApi'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Card } from '@/components/Card'
import type { WorkoutTemplate } from '@/lib/types'

export function TemplatesTab() {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const reload = async () => {
    setLoading(true)
    try {
      setTemplates(await fetchTemplates())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    await createTemplate(newName.trim())
    setNewName('')
    setShowAdd(false)
    reload()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return
    await deleteTemplate(id)
    reload()
  }

  if (loading) return <p className="text-text-secondary">Loading templates…</p>

  return (
    <div className="flex flex-col gap-4">
      <Button variant="secondary" fullWidth onClick={() => setShowAdd(!showAdd)}>
        {showAdd ? 'Cancel' : '+ New template'}
      </Button>

      {showAdd && (
        <Card className="flex gap-2">
          <Input
            placeholder="Template name (e.g. Push Day)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleCreate}>Save</Button>
        </Card>
      )}

      <ul className="flex flex-col gap-2">
        {templates.map((t) => (
          <li key={t.id}>
            <Card padding="sm">
              <div className="flex items-center justify-between">
                <Link to={`/library/templates/${t.id}`} className="font-medium text-accent">
                  {t.name}
                </Link>
                <button type="button" onClick={() => handleDelete(t.id)} className="text-sm text-danger">
                  Delete
                </button>
              </div>
            </Card>
          </li>
        ))}
        {templates.length === 0 && (
          <p className="text-sm text-text-secondary">No templates yet. Create one to reuse workouts.</p>
        )}
      </ul>
    </div>
  )
}
