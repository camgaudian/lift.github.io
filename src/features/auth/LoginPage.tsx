import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { AppIcon } from '@/components/AppIcon'
import { AuthPageLayout } from '@/components/AuthPageLayout'
import { Card } from '@/components/Card'
import { isSupabaseConfigured } from '@/lib/supabase'

export function LoginPage() {
  const { signIn, user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await signIn(email, password)
    setLoading(false)
    if (err) setError(err.message)
  }

  return (
    <AuthPageLayout>
      <div className="mb-4 text-center">
        <div className="flex items-center justify-center gap-1.5">
          <AppIcon size={30} />
          <h1 className="text-3xl font-semibold tracking-tight">Lift</h1>
        </div>
        <p className="mt-1 text-text-secondary">Train together</p>
      </div>

      {!isSupabaseConfigured && (
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-900">
            Supabase is not configured. Copy <code className="text-xs">.env.example</code> to{' '}
            <code className="text-xs">.env</code> and add your keys. See{' '}
            <code className="text-xs">supabase/SETUP.md</code>.
          </p>
        </Card>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-text-secondary">
          No account?{' '}
          <Link to="/signup" className="text-accent font-medium">
            Sign up
          </Link>
        </p>
      </Card>
    </AuthPageLayout>
  )
}
