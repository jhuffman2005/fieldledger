import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin }
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSent(true)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)', padding: '1rem'
    }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '1.25rem',
            fontWeight: '500', letterSpacing: '-0.02em', marginBottom: '0.25rem'
          }}>
            FieldLedger
          </div>
          <div style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>
            Job costing for contractors who work in the real world.
          </div>
        </div>

        <div className="card">
          {sent ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>✉️</div>
              <h2 style={{ marginBottom: '0.5rem' }}>Check your email</h2>
              <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>
                We sent a login link to <strong>{email}</strong>.<br />
                Click it to sign in — no password needed.
              </p>
              <button
                className="btn btn-sm"
                style={{ marginTop: '1.25rem' }}
                onClick={() => { setSent(false); setEmail('') }}
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin}>
              <h2 style={{ marginBottom: '1.25rem' }}>Sign in</h2>
              <div style={{ marginBottom: '1rem' }}>
                <label className="field-label">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                />
              </div>
              {error && (
                <div style={{
                  background: 'var(--red-bg)', color: 'var(--red)',
                  padding: '0.625rem 0.75rem', borderRadius: 'var(--radius)',
                  fontSize: '0.8125rem', marginBottom: '1rem'
                }}>
                  {error}
                </div>
              )}
              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={loading}
                style={{ justifyContent: 'center' }}
              >
                {loading ? 'Sending…' : 'Send login link'}
              </button>
              <p style={{ color: 'var(--text-3)', fontSize: '0.75rem', marginTop: '0.75rem', textAlign: 'center' }}>
                No password. We'll email you a link each time.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
