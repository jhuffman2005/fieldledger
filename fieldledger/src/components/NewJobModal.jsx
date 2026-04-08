import { useState } from 'react'

export default function NewJobModal({ onSave, onClose }) {
  const [name, setName] = useState('')
  const [client, setClient] = useState('')
  const [ohp, setOhp] = useState('28')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError('')
    const result = await onSave({ name: name.trim(), client: client.trim(), ohp })
    setSaving(false)
    if (result?.error) { setError(result.error.message); return }
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="card" style={{ width: '100%', maxWidth: '360px' }}>
        <h2 style={{ marginBottom: '1.25rem' }}>New job</h2>
        <form onSubmit={handleSave}>
          <div style={{ marginBottom: '0.75rem' }}>
            <label className="field-label">Job name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="123 Oak St remodel"
              autoFocus
              required
            />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label className="field-label">Client name</label>
            <input
              type="text"
              value={client}
              onChange={e => setClient(e.target.value)}
              placeholder="Smith family"
            />
          </div>
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="field-label">OH &amp; profit %</label>
            <input
              type="number"
              value={ohp}
              onChange={e => setOhp(e.target.value)}
              min="0" max="100" step="0.5"
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.3rem' }}>
              Applied to your cost total to get the project price
            </div>
          </div>
          {error && (
            <div style={{
              background: 'var(--red-bg)', color: 'var(--red)',
              padding: '0.5rem 0.75rem', borderRadius: 'var(--radius)',
              fontSize: '0.8125rem', marginBottom: '1rem'
            }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
