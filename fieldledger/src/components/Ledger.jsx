import { useState } from 'react'
import { useJobs, useAllEntries } from '../hooks/useJobs'

function fmt(n) {
  return '$' + (parseFloat(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function Ledger() {
  const { jobs } = useJobs()
  const { entries, loading, deleteEntry } = useAllEntries()
  const [jobFilter, setJobFilter] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  const filtered = jobFilter ? entries.filter(e => e.job_id === jobFilter) : entries
  const total = filtered.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)

  async function handleDelete(id) {
    await deleteEntry(id)
    setConfirmDelete(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1>Ledger</h1>
        <div className="flex gap-2 items-center">
          <select
            value={jobFilter}
            onChange={e => setJobFilter(e.target.value)}
            style={{ fontSize: '0.875rem', minWidth: '200px' }}
          >
            <option value="">All jobs</option>
            {jobs.map(j => (
              <option key={j.id} value={j.id}>
                {j.name}{j.client ? ` · ${j.client}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)' }}>
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-3)' }}>
            No expenses yet.{' '}
            <a href="/log" style={{ color: 'var(--text-2)' }}>Log your first one →</a>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Date', 'Job', 'Cost code', 'Payee', 'Description', 'Paid with', 'Amount', ''].map(h => (
                    <th key={h} style={{
                      padding: '0.625rem 0.875rem', textAlign: h === 'Amount' ? 'right' : 'left',
                      fontSize: '0.75rem', fontWeight: '500', color: 'var(--text-2)',
                      textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr
                    key={e.id}
                    style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={ev => ev.currentTarget.style.background = 'var(--surface2)'}
                    onMouseLeave={ev => ev.currentTarget.style.background = ''}
                  >
                    <td style={{ padding: '0.625rem 0.875rem', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>{e.date}</td>
                    <td style={{ padding: '0.625rem 0.875rem', whiteSpace: 'nowrap' }}>
                      {e.jobs?.name || '—'}
                    </td>
                    <td style={{ padding: '0.625rem 0.875rem', fontWeight: '500' }}>{e.cost_code}</td>
                    <td style={{ padding: '0.625rem 0.875rem' }}>{e.payee || '—'}</td>
                    <td style={{ padding: '0.625rem 0.875rem', color: 'var(--text-2)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.description || '—'}
                    </td>
                    <td style={{ padding: '0.625rem 0.875rem' }}>
                      <span className="pill">{e.payment_type}</span>
                    </td>
                    <td style={{ padding: '0.625rem 0.875rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: '500', whiteSpace: 'nowrap' }}>
                      {fmt(e.amount)}
                    </td>
                    <td style={{ padding: '0.625rem 0.625rem', textAlign: 'center' }}>
                      {confirmDelete === e.id ? (
                        <span className="flex gap-2">
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(e.id)}>Delete</button>
                          <button className="btn btn-sm" onClick={() => setConfirmDelete(null)}>Cancel</button>
                        </span>
                      ) : (
                        <button
                          className="btn btn-sm"
                          onClick={() => setConfirmDelete(e.id)}
                          style={{ color: 'var(--text-3)', border: 'none', background: 'none' }}
                        >
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border)' }}>
                  <td colSpan={6} style={{ padding: '0.625rem 0.875rem', fontSize: '0.8125rem', color: 'var(--text-2)', textAlign: 'right', fontWeight: '500' }}>
                    Total ({filtered.length} entries)
                  </td>
                  <td style={{ padding: '0.625rem 0.875rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: '600', fontSize: '1rem' }}>
                    {fmt(total)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
