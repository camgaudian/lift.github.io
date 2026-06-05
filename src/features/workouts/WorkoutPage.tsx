import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  fetchActiveWorkout,
  startEmptyWorkout,
  startWorkoutFromTemplate,
  createCompletedWorkout,
} from './workoutApi'
import { fetchTemplates } from '@/features/templates/templateApi'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Input } from '@/components/Input'
import type { WorkoutTemplate } from '@/lib/types'

export function WorkoutPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [active, setActive] = useState<{ id: string } | null>(null)
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showPostLog, setShowPostLog] = useState(false)
  const [postStarted, setPostStarted] = useState('')
  const [postCompleted, setPostCompleted] = useState('')

  useEffect(() => {
    const init = async () => {
      const w = await fetchActiveWorkout()
      setActive(w)
      setTemplates(await fetchTemplates())
      setLoading(false)

      const templateId = searchParams.get('template')
      if (templateId && !w) {
        const id = await startWorkoutFromTemplate(templateId)
        navigate(`/workout/${id}`, { replace: true })
      }
    }
    init()
  }, [searchParams, navigate])

  const handleStartEmpty = async () => {
    const id = await startEmptyWorkout()
    navigate(`/workout/${id}`)
  }

  const handleStartTemplate = async (templateId: string) => {
    const id = await startWorkoutFromTemplate(templateId)
    navigate(`/workout/${id}`)
  }

  const handlePostLog = async () => {
    if (!postStarted || !postCompleted) return
    const w = await createCompletedWorkout(
      new Date(postStarted).toISOString(),
      new Date(postCompleted).toISOString(),
    )
    navigate(`/workout/${w.id}`)
  }

  if (loading) return <LoadingSpinner />

  if (active) {
    return (
      <div className="flex min-h-[calc(100dvh-7rem)] flex-col justify-center gap-5 py-6">
        <h1 className="text-2xl font-semibold">Workout</h1>
        <Card>
          <p className="text-text-secondary">You have a workout in progress.</p>
          <Button className="mt-4" fullWidth onClick={() => navigate(`/workout/${active.id}`)}>
            Continue workout
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col justify-center gap-5 py-6">
      <h1 className="text-2xl font-semibold">Workout</h1>

      <Button fullWidth size="lg" onClick={handleStartEmpty}>
        Start empty workout
      </Button>

      <Button variant="secondary" fullWidth onClick={() => setShowPostLog(!showPostLog)}>
        {showPostLog ? 'Cancel post-log' : 'Log past workout'}
      </Button>

      {showPostLog && (
        <Card className="flex flex-col gap-3">
          <Input
            label="Started"
            type="datetime-local"
            value={postStarted}
            onChange={(e) => setPostStarted(e.target.value)}
          />
          <Input
            label="Completed"
            type="datetime-local"
            value={postCompleted}
            onChange={(e) => setPostCompleted(e.target.value)}
          />
          <Button onClick={handlePostLog} disabled={!postStarted || !postCompleted}>
            Create & add exercises
          </Button>
        </Card>
      )}

      {templates.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-text-secondary">From template</h2>
          <ul className="flex flex-col gap-2">
            {templates.map((t) => (
              <li key={t.id}>
                <Button variant="secondary" fullWidth onClick={() => handleStartTemplate(t.id)}>
                  {t.name}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-sm text-text-secondary text-center">
        <Link to="/library" className="text-accent">Manage templates</Link> in Library
      </p>
    </div>
  )
}
