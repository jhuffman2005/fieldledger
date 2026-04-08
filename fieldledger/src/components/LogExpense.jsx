import { useState, useRef } from 'react'
import { useJobs, useEntries, useUsedCodes } from '../hooks/useJobs'
import NewJobModal from './NewJobModal'
import CostCodeInput from './CostCodeInput'

const today = () => new Date().toISOString().split('T')[0]

const PAYMENT_TYPES = ['Cash', 'Personal card', 'Business card', 'Debit', 'Check', 'Zelle / Venmo', 'Other']

export default function LogExpense() {
  const { jobs, createJob } = useJobs()
  const usedCodes = useUsedCodes()

  const [jobId, setJobId] = useState('')
  const [date, setDate] = useState(today())
  const [payee, setPayee] = useState('')
  const [costCode, setCostCode] = useState('')
  const [payType, setPayType] = useState('Cash')
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('')

  const [voiceOn, setVoiceOn] = useState(false)
  const [voiceText, setVoiceText] = useState('')
  const [micActive, setMicActive] = useState(false)
  const [parseStatus, setParseStatus] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const { addEntry } = useEntries(jobId || null)
  const recogRef = useRef(null)

  function flash(text, type = 'success') {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 3000)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!jobId || !costCode.trim() || !amount) {
      flash('Job, cost code, and amount are required.', 'error')
      return
    }
    setSaving(true)
    const { error } = await addEntry({
      job_id: jobId,
      date,
      payee: payee.trim() || null,
      cost_code: costCode.trim(),
      payment_type: payType,
      amount: parseFloat(amount),
      description: desc.trim() || null,
    })
    setSaving(false)
    if (error) { flash(error.message, 'error'); return }
    setPayee(''); setCostCode(''); setAmount(''); setDesc('')
    setDate(today())
    flash('Expense logged!')
  }

  async function handleCreateJob(data) {
    const result = await createJob(data)
    if (!result.error) setJobId(result.data.id)
    return result
  }

  function startMic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setParseStatus('Speech recognition not available in this browser.'); return }
    const recog = new SR()
    recog.continuous = false
    recog.interimResults = false
    recog.onstart = () => setMicActive(true)
    recog.onresult = e => { setVoiceText(e.results[0][0].transcript); setMicActive(false) }
    recog.onerror = recog.onend = () => setMicActive(false)
    recogRef.current = recog
    recog.start()
  }

  async function parseVoice() {
    if (!voiceText.trim()) return
    setParseStatus('Parsing…')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 300,
          messages: [{
            role: 'user',
            content: `Parse this contractor expense note into JSON. Return ONLY valid JSON, no markdown.
Input: "${voiceText}"
Known cost codes this contractor uses: ${usedCodes.slice(0, 20).join(', ') || 'none yet'}
Return: {"payee":string,"amount":number,"cost_code":string,"payment_type":string,"description":string}
For cost_code: match to a known code if it fits, otherwise invent a short clean category (under 4 words).
For payment_type, choose from: ${PAYMENT_TYPES.join(', ')}`
          }]
        })
      })
      const data = await res.json()
      const raw = data.content?.map(b => b.text || '').join('') || ''
      const p = JSON.parse(raw.replace(/```json|```/g, '').trim())
      if (p.payee) setPayee(p.payee)
      if (p.amount) setAmount(String(p.amount))
      if (p.cost_code) setCostCode(p.cost_code)
      if (p.payment_type) setPayType(p.payment_type)
      if (p.description) setDesc(p.description)
      setParseStatus('Fields filled — review and confirm.')
      setVoiceText('')
    } catch (e) {
      setParseStatus('Could not parse — fill in manually.')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1>Log expense</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
          + New job
        </button>
      </div>

      <div className="card">
        {/* Job selector */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label className="field-label">Job *</label>
          <div className="flex gap-2">
            <select
              value={jobId}
              onChange={e => setJobId(e.target.value)}
              style={{ flex: 1 }}
            >
              <option value="">— select a job —</option>
              {jobs.map(j => (
                <option key={j.id} value={j.id}>
                  {j.name}{j.client ? ` · ${j.client}` : ''}
                </option>
              ))}
            </select>
            <button className="btn btn-sm" onClick={() => setShowModal(true)} style={{ whiteSpace: 'nowrap' }}>
              + New
            </button>
          </div>
        </div>

        {/* Voice toggle */}
        <div className="flex items-center gap-2" style={{ marginBottom: '1rem' }}>
          <button
            onClick={() => setVoiceOn(v => !v)}
            style={{
              width: '36px', height: '20px', borderRadius: '10px', border: 'none',
              background: voiceOn ? 'var(--accent)' : 'var(--border-strong)',
              position: 'relative', cursor: 'pointer', transition: 'background 0.15s',
              flexShrink: 0,
            }}
          >
            <span style={{
              position: 'absolute', top: '2px',
              left: voiceOn ? '18px' : '2px',
              width: '16px', height: '16px', borderRadius: '50%',
              background: '#fff', transition: 'left 0.15s',
            }} />
          </button>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>
            Voice entry — speak your expense, AI fills the fields
          </span>
        </div>

        {/* Voice area */}
        {voiceOn && (
          <div style={{
            background: 'var(--surface2)', borderRadius: 'var(--radius)',
            padding: '1rem', marginBottom: '1.25rem', border: '1px solid var(--border)'
          }}>
            <div className="flex gap-2" style={{ marginBottom: '0.75rem' }}>
              <textarea
                value={voiceText}
                onChange={e => setVoiceText(e.target.value)}
                rows={2}
                placeholder='e.g. "Paid $340 cash to Home Depot for framing lumber"'
                style={{ flex: 1 }}
              />
              <button
                className="btn btn-sm"
                onClick={startMic}
                style={{ alignSelf: 'flex-start', minWidth: '60px' }}
              >
                {micActive ? '● Rec' : 'Mic'}
              </button>
            </div>
            <button className="btn btn-primary btn-sm" onClick={parseVoice}>
              Parse with AI →
            </button>
            {parseStatus && (
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-2)', marginTop: '0.5rem' }}>
                {parseStatus}
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label className="field-label">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Payee / vendor</label>
              <input
                type="text" value={payee} onChange={e => setPayee(e.target.value)}
                placeholder="Home Depot, J. Smith…"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label className="field-label">Cost code *</label>
              <CostCodeInput value={costCode} onChange={setCostCode} usedCodes={usedCodes} />
            </div>
            <div>
              <label className="field-label">How you paid</label>
              <select value={payType} onChange={e => setPayType(e.target.value)}>
                {PAYMENT_TYPES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Amount ($) *</label>
              <input
                type="number" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0.00" min="0" step="0.01"
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label className="field-label">Description</label>
            <input
              type="text" value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="What was this for?"
            />
          </div>

          <div className="flex items-center justify-between">
            <div style={{ fontSize: '0.875rem' }}>
              {msg && (
                <span style={{ color: msg.type === 'error' ? 'var(--red)' : 'var(--green)' }}>
                  {msg.text}
                </span>
              )}
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Add expense'}
            </button>
          </div>
        </form>
      </div>

      {showModal && (
        <NewJobModal onSave={handleCreateJob} onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}
