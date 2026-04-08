import { useState, useRef, useEffect } from 'react'

export default function CostCodeInput({ value, onChange, usedCodes }) {
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [aiLoading, setAiLoading] = useState(false)
  const timerRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    if (!value || value.length < 1) {
      setSuggestions([])
      setOpen(false)
      return
    }

    const lower = value.toLowerCase()
    const history = usedCodes
      .filter(c => c.toLowerCase().includes(lower))
      .slice(0, 6)
      .map(c => ({ label: c, source: 'history' }))

    if (history.length) {
      setSuggestions(history)
      setOpen(true)
    }

    clearTimeout(timerRef.current)
    if (value.length >= 2) {
      timerRef.current = setTimeout(() => fetchAiSuggestions(value, history), 380)
    }

    return () => clearTimeout(timerRef.current)
  }, [value, usedCodes])

  async function fetchAiSuggestions(val, existing) {
    setAiLoading(true)
    const existingLabels = existing.map(e => e.label)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 150,
          messages: [{
            role: 'user',
            content: `A contractor is typing a job cost category. They typed: "${val}"
Return 3 short construction cost category suggestions (under 4 words each).
Already shown from history: ${existingLabels.join(', ') || 'none'}
Return ONLY a JSON array of strings, no markdown. Example: ["Electrical","Electrical - rough in","Electrical - trim out"]`
          }]
        })
      })
      const data = await res.json()
      const raw = data.content?.map(b => b.text || '').join('') || '[]'
      const aiSuggestions = JSON.parse(raw.replace(/```json|```/g, '').trim())
      const merged = [
        ...existing,
        ...aiSuggestions
          .filter(s => !existingLabels.includes(s))
          .map(s => ({ label: s, source: 'ai' }))
      ].slice(0, 8)
      const currentVal = inputRef.current?.value
      if (currentVal) {
        setSuggestions(merged)
        setOpen(true)
      }
    } catch (e) {
      // AI failed — history suggestions still shown
    } finally {
      setAiLoading(false)
    }
  }

  function pick(label) {
    onChange(label)
    setOpen(false)
    setSuggestions([])
    setFocusedIndex(-1)
  }

  function handleKeyDown(e) {
    if (!open || !suggestions.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && focusedIndex >= 0) {
      e.preventDefault()
      pick(suggestions[focusedIndex].label)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 160)}
        onFocus={() => { if (suggestions.length) setOpen(true) }}
        placeholder="Type anything — e.g. Electrical, Paint, Demo"
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div
          ref={listRef}
          style={{
            position: 'absolute', top: 'calc(100% + 3px)', left: 0, right: 0,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', zIndex: 50, overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        >
          {suggestions.map((s, i) => (
            <div
              key={s.label}
              onMouseDown={() => pick(s.label)}
              style={{
                padding: '0.5rem 0.75rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                cursor: 'pointer',
                background: i === focusedIndex ? 'var(--surface2)' : 'transparent',
                fontSize: '0.875rem',
                borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <span>{s.label}</span>
              <span style={{
                fontSize: '0.6875rem', color: 'var(--text-3)',
                fontFamily: 'var(--font-mono)',
              }}>
                {s.source === 'history' ? 'used before' : 'AI'}
              </span>
            </div>
          ))}
          {aiLoading && (
            <div style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.75rem', color: 'var(--text-3)',
              borderTop: suggestions.length ? '1px solid var(--border)' : 'none',
            }}>
              Getting AI suggestions…
            </div>
          )}
        </div>
      )}
    </div>
  )
}
