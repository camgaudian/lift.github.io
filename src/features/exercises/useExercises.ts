import { useEffect, useState } from 'react'
import { fetchExercises } from './exerciseApi'
import type { Exercise } from '@/lib/types'

export function useExercises() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = async () => {
    setLoading(true)
    setError(null)
    try {
      setExercises(await fetchExercises())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load exercises')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  return { exercises, loading, error, reload }
}
