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
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Modal } from '@/components/Modal'
import { ShareIcon } from '@/components/ShareIcon'
import { TrashIcon } from '@/components/TrashIcon'
import { FriendPickerModal } from '@/features/sharing/FriendPickerModal'
import { formatExercisePreview } from '@/lib/format'
import { iconDeleteButtonClass } from '@/lib/ui'
import type { WorkoutTemplate } from '@/lib/types'

export function TemplatesTab() {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<WorkoutTemplate | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [shareTarget, setShareTarget] = useState<WorkoutTemplate | null>(null)

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

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteTemplate(deleteTarget.id)
      setDeleteTarget(null)
      reload()
    } catch {
      setDeleteError('Failed to delete template.')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <LoadingSpinner size="section" />

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
          <li key={t.id} className="w-full">
            <Card padding="sm" className="relative">
              <Link
                to={`/library/templates/${t.id}`}
                className="absolute inset-0 z-0 rounded-2xl transition-[filter] hover:brightness-[0.97] active:brightness-[0.94]"
                aria-label={`View ${t.name} template`}
              />
              <div className="pointer-events-none relative z-[1] flex items-center justify-between gap-2 pr-16">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-accent">{t.name}</p>
                  <p className="mt-0.5 text-sm text-text-secondary truncate">
                    {t.exercise_names?.length
                      ? formatExercisePreview(t.exercise_names)
                      : 'No exercises yet'}
                  </p>
                </div>
              </div>
              <div className="absolute top-1/2 right-2 z-[2] flex -translate-y-1/2 items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setShareTarget(t)}
                  className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface-secondary hover:text-accent"
                  aria-label={`Share ${t.name}`}
                >
                  <ShareIcon />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(null)
                    setDeleteTarget(t)
                  }}
                  className={iconDeleteButtonClass}
                  aria-label={`Delete ${t.name}`}
                >
                  <TrashIcon />
                </button>
              </div>
            </Card>
          </li>
        ))}
        {templates.length === 0 && (
          <p className="text-sm text-text-secondary">No templates yet. Create one to reuse workouts.</p>
        )}
      </ul>

      {deleteTarget && (
        <Modal title="Delete template?" onClose={() => !deleting && setDeleteTarget(null)}>
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
          kind="template"
          itemId={shareTarget.id}
          itemName={shareTarget.name}
          onClose={() => setShareTarget(null)}
        />
      )}
    </div>
  )
}
