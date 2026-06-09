import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { AuthPageLayout } from '@/components/AuthPageLayout'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Card } from '@/components/Card'

const RESEND_DELAY_MS = 60_000
const RESEND_COOLDOWN_SEC = 60

function SignUpSuccess({ email }: { email: string }) {
  const { resendConfirmationEmail } = useAuth()
  const [canResend, setCanResend] = useState(false)
  const [cooldownSec, setCooldownSec] = useState(0)
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const [resendError, setResendError] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setCanResend(true), RESEND_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (cooldownSec <= 0) return
    const timer = window.setInterval(() => {
      setCooldownSec((sec) => {
        if (sec <= 1) {
          setCanResend(true)
          return 0
        }
        return sec - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldownSec])

  const handleResend = async () => {
    setResendError('')
    setResendMessage('')
    setResending(true)
    const { error } = await resendConfirmationEmail(email)
    setResending(false)
    if (error) {
      setResendError(error.message)
      return
    }
    setResendMessage('Confirmation email sent. Check your inbox and spam folder.')
    setCanResend(false)
    setCooldownSec(RESEND_COOLDOWN_SEC)
  }

  return (
    <AuthPageLayout>
      <Card className="text-center">
        <h2 className="text-xl font-semibold">Check your email</h2>
        <p className="mt-2 text-text-secondary">
          We sent a confirmation link to <strong>{email}</strong>.
          <br />Confirm your email, then sign in.
        </p>

        {canResend ? (
          <div className="mt-4">
            <Button
              variant="secondary"
              fullWidth
              disabled={resending}
              onClick={handleResend}
            >
              {resending ? 'Sending…' : 'Resend confirmation email'}
            </Button>
          </div>
        ) : cooldownSec > 0 ? (
          <p className="mt-4 text-sm text-text-secondary">
            Resend available in {cooldownSec}s
          </p>
        ) : (
          <p className="mt-4 text-sm text-text-secondary">
            Didn&apos;t get it? You can resend in about a minute.
          </p>
        )}

        {resendMessage && <p className="mt-3 text-sm text-accent">{resendMessage}</p>}
        {resendError && <p className="mt-3 text-sm text-danger">{resendError}</p>}

        <Link to="/login" className="mt-4 inline-block text-accent font-medium">
          Back to sign in
        </Link>
      </Card>
    </AuthPageLayout>
  )
}

export function SignUpPage() {
  const { signUp, user } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await signUp(email, password, displayName || undefined)
    setLoading(false)
    if (err) {
      setError(err.message)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return <SignUpSuccess email={email} />
  }

  return (
    <AuthPageLayout>
      <div className="mb-4 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Create account</h1>
        <p className="mt-1 text-text-secondary">Ready to Lift?</p>
      </div>
      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Username"
            type="text"
            autoComplete="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
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
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? 'Creating…' : 'Sign up'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-text-secondary">
          Already have an account?{' '}
          <Link to="/login" className="text-accent font-medium">
            Sign in
          </Link>
        </p>
      </Card>
    </AuthPageLayout>
  )
}
