import { useState } from 'react'
import { useJobs, useEntries, usePayments } from '../hooks/useJobs'
import NewJobModal from './NewJobModal'
import { exportReconciliationXlsx } from '../utils/xlsxExport'

function fmt(n) {
  return '$' + (parseFloat(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function Reconciliation() {
  const { jobs, createJob } = useJobs()
  const [jobId, setJobId] = useState('')
  const [budgetOn, setBudgetOn] = useState(false)
  const [budgets, setBudgets] = useState({})
  const [notes, setNotes] = useState({})
  const [showModal, setShowModal] = useState(false)

  const selectedJob = jobs.find(j => j.id === jobId)
  const { entries } = useEntries(jobId || null)
  const { payments, addPayment, updatePayment, deletePayment } = usePayments(jobId || null)

  const ohpRate = (selectedJob?.ohp || 28) / 100

  const byCode = {}
  entries.forEach(e => {
    byCode[e.cost_code] = (byCode[e.cost_code] || 0) + parseFloat(e.amount || 0)
  })
  const allCodes = Object.keys(byCode).sort()
  const totalCost = allCodes.reduce((s, c) => s + byCode[c], 0)
  const ohpAmt = totalCost * ohpRate
  const projectTotal = totalCost + ohpAmt
  const totalBudget = budgetOn ? allCodes.reduce((s, c) => s + (budgets[c] || 0), 0) : 0
  const totalPaid = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)
  const balanceDue = projectTotal - totalPaid
  const overUnderTotal = budgetOn && totalBudget ? totalCost - totalBudget : null

  function handleExport() {
    if (!selectedJob) return
    exportReconciliationXlsx({ job: selectedJob, entries, payments, budgetOn, budgets })
  }

  async function handleAddPayment() {
    await addPayment({ label: `Invoice ${payments.length + 1}`, amount: 0 })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1>Reconciliation</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ New job</button>
      </div>

      {/* Job selector */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div className="flex gap-2">
          <select
            value={jobId}
            onChange={e => setJobId(e.target.value)}
            style={{ flex: 1, fontSize: '0.9375rem', fontWeight: '500' }}
          >
            <option value="">— select a job —</option>
            {jobs.map(j => (
              <option key={j.id} value={j.id}>
                {j.name}{j.client ? ` · ${j.client}` : ''}
              </option>
            ))}
          </select>
          <button className="btn btn-sm" onClick={() => setShowModal(true)}>+ New</button>
        </div>
      </div>

      {!jobId ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)' }}>
          Select a job above to see its reconciliation.
        </div>
      ) : (
        <>
          {/* Summary metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '10px', marginBottom: '1.25rem' }}>
            {[
              { label: 'Cost total', value: fmt(totalCost), color: null },
              { label: `OH & profit (${selectedJob?.ohp || 28}%)`, value: fmt(ohpAmt), color: null },
              { label: 'Project total', value: fmt(projectTotal), color: null },
              {
                label: overUnderTotal === null ? 'Budget' : overUnderTotal > 0 ? 'Over budget' : 'Under budget',
                value: overUnderTotal === null ? '—' : fmt(Math.abs(overUnderTotal)),
                color: overUnderTotal === null ? null : overUnderTotal > 0 ? 'red' : 'green'
              },
            ].map(m => (
              <div key={m.label} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', padding: '1rem',
                boxShadow: 'var(--shadow)',
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '500', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.375rem' }}>
                  {m.label}
                </div>
                <div style={{
                  fontSize: '1.25rem', fontWeight: '600', fontFamily: 'var(--font-mono)',
                  color: m.color === 'red' ? 'var(--red)' : m.color === 'green' ? 'var(--green)' : 'var(--text)',
                }}>
                  {m.value}
                </div>
              </div>
            ))}
          </div>

          {/* Reconciliation table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1rem' }}>
            <div className="flex items-center justify-between" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
              <h2>Cost breakdown</h2>
              <div className="flex gap-3 items-center">
                <label className="flex items-center gap-2" style={{ cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-2)' }}>
                  <input
                    type="checkbox"
                    checked={budgetOn}
                    onChange={e => setBudgetOn(e.target.checked)}
                    style={{ width: 'auto' }}
                  />
                  Show budget column
                </label>
                <button className="btn btn-sm" onClick={handleExport}>
                  Export .xlsx
                </button>
              </div>
            </div>

            {allCodes.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)' }}>
                No expenses logged for this job yet.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={thStyle('left')}>Cost code</th>
                      {budgetOn && <th style={thStyle('right')}>Budget</th>}
                      <th style={thStyle('right')}>Actuals</th>
                      <th style={thStyle('right')}>Over / under</th>
                      <th style={thStyle('left')}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allCodes.map(code => {
                      const actual = byCode[code] || 0
                      const budget = budgetOn ? (budgets[code] || 0) : 0
                      const ou = budgetOn && budget ? actual - budget : null
                      const ouColor = ou === null ? null : ou > 0 ? 'var(--red)' : 'var(--green)'
                      const codeEntries = entries.filter(e => e.cost_code === code)

                      return [
                        <tr key={code} style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
                          <td style={{ ...tdStyle(), fontWeight: '600' }}>{code}</td>
                          {budgetOn && (
                            <td style={tdStyle('right')}>
                              <input
                                type="number"
                                value={budgets[code] || ''}
                                onChange={e => setBudgets(b => ({ ...b, [code]: parseFloat(e.target.value) || 0 }))}
                                placeholder="—"
                                min="0" step="0.01"
                                style={{ textAlign: 'right', width: '90px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.2rem 0.4rem', fontSize: '0.875rem', background: 'var(--surface)', fontFamily: 'var(--font-mono)' }}
                              />
                            </td>
                          )}
                          <td style={{ ...tdStyle('right'), fontFamily: 'var(--font-mono)', fontWeight: '600' }}>{fmt(actual)}</td>
                          <td style={{ ...tdStyle('right'), fontFamily: 'var(--font-mono)', fontWeight: '600', color: ouColor || 'var(--text-3)' }}>
                            {ou === null ? '—' : fmt(ou)}
                          </td>
                          <td style={tdStyle()}>
                            <input
                              type="text"
                              value={notes[code] || ''}
                              onChange={e => setNotes(n => ({ ...n, [code]: e.target.value }))}
                              placeholder="notes…"
                              style={{ border: 'none', background: 'transparent', fontSize: '0.8125rem', color: 'var(--text-2)', width: '100%', outline: 'none', padding: 0 }}
                            />
                          </td>
                        </tr>,
                        ...codeEntries.map(e => (
                          <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ ...tdStyle(), paddingLeft: '1.75rem', color: 'var(--text-2)', fontSize: '0.8125rem' }}>
                              {e.payee || e.description || '—'}
                              {e.payment_type && <span className="pill" style={{ marginLeft: '6px' }}>{e.payment_type}</span>}
                            </td>
                            {budgetOn && <td style={tdStyle()} />}
                            <td style={{ ...tdStyle('right'), fontFamily: 'var(--font-mono)', color: 'var(--text-2)', fontSize: '0.8125rem' }}>{fmt(e.amount)}</td>
                            <td style={tdStyle()} />
                            <td style={{ ...tdStyle(), fontSize: '0.8125rem', color: 'var(--text-3)' }}>{e.description || ''}</td>
                          </tr>
                        ))
                      ]
                    })}

                    {/* Spacer */}
                    <tr><td colSpan={budgetOn ? 5 : 4} style={{ height: '4px', background: 'var(--bg)' }} /></tr>

                    {/* Cost subtotal */}
                    <TotalRow label="Cost subtotal" actual={totalCost} budget={totalBudget} ou={overUnderTotal} budgetOn={budgetOn} bold />

                    {/* OH & profit */}
                    <tr style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ ...tdStyle(), fontWeight: '500' }}>OH & profit ({selectedJob?.ohp || 28}%)</td>
                      {budgetOn && <td style={{ ...tdStyle('right'), fontFamily: 'var(--font-mono)' }}>{fmt(totalBudget * ohpRate)}</td>}
                      <td style={{ ...tdStyle('right'), fontFamily: 'var(--font-mono)', fontWeight: '500' }}>{fmt(ohpAmt)}</td>
                      <td style={tdStyle()} />
                      <td style={tdStyle()} />
                    </tr>

                    {/* Project total */}
                    <tr style={{ borderTop: '2px solid var(--border-strong)', background: 'var(--surface2)' }}>
                      <td style={{ ...tdStyle(), fontWeight: '700', fontSize: '0.9375rem' }}>Project total</td>
                      {budgetOn && <td style={{ ...tdStyle('right'), fontFamily: 'var(--font-mono)', fontWeight: '700' }}>{fmt(totalBudget * (1 + ohpRate))}</td>}
                      <td style={{ ...tdStyle('right'), fontFamily: 'var(--font-mono)', fontWeight: '700', fontSize: '0.9375rem' }}>{fmt(projectTotal)}</td>
                      <td style={tdStyle()} />
                      <td style={tdStyle()} />
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payments section */}
          <div className="card">
            <h2 style={{ marginBottom: '1rem' }}>Payments received</h2>
            {payments.length === 0 && (
              <div style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                No payments logged yet.
              </div>
            )}
            {payments.map((p, i) => (
              <div key={p.id} className="flex gap-2 items-center" style={{ marginBottom: '0.625rem' }}>
                <input
                  type="text"
                  value={p.label}
                  onChange={e => updatePayment(p.id, { label: e.target.value })}
                  placeholder="Label"
                  style={{ flex: 2 }}
                />
                <input
                  type="number"
                  value={p.amount || ''}
                  onChange={e => updatePayment(p.id, { amount: parseFloat(e.target.value) || 0 })}
                  placeholder="Amount"
                  min="0" step="0.01"
                  style={{ flex: 1, textAlign: 'right', fontFamily: 'var(--font-mono)' }}
                />
                <button className="btn btn-sm btn-danger" onClick={() => deletePayment(p.id)}>×</button>
              </div>
            ))}
            <button className="btn btn-sm" onClick={handleAddPayment} style={{ marginTop: '0.25rem' }}>
              + Add payment
            </button>

            <div className="divider" />

            <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>Total paid</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600' }}>{fmt(totalPaid)}</span>
            </div>
            <div className="flex justify-between items-center" style={{
              padding: '0.75rem', borderRadius: 'var(--radius)',
              background: balanceDue > 0 ? 'var(--red-bg)' : 'var(--green-bg)',
            }}>
              <span style={{ fontWeight: '600', fontSize: '0.9375rem' }}>Balance due</span>
              <span style={{
                fontFamily: 'var(--font-mono)', fontWeight: '700', fontSize: '1.125rem',
                color: balanceDue > 0 ? 'var(--red)' : 'var(--green)'
              }}>
                {fmt(balanceDue)}
              </span>
            </div>
          </div>
        </>
      )}

      {showModal && (
        <NewJobModal onSave={createJob} onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}

function thStyle(align = 'left') {
  return {
    textAlign: align, padding: '0.625rem 0.875rem',
    fontSize: '0.75rem', fontWeight: '500', color: 'var(--text-2)',
    textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap',
  }
}

function tdStyle(align = 'left') {
  return { padding: '0.625rem 0.875rem', textAlign: align, verticalAlign: 'middle' }
}

function TotalRow({ label, actual, budget, ou, budgetOn, bold }) {
  const ouColor = ou === null ? null : ou > 0 ? 'var(--red)' : 'var(--green)'
  return (
    <tr style={{ borderTop: '1px solid var(--border)' }}>
      <td style={{ ...tdStyle(), fontWeight: bold ? '600' : '400' }}>{label}</td>
      {budgetOn && <td style={{ ...tdStyle('right'), fontFamily: 'var(--font-mono)', fontWeight: bold ? '600' : '400' }}>{fmt(budget)}</td>}
      <td style={{ ...tdStyle('right'), fontFamily: 'var(--font-mono)', fontWeight: bold ? '600' : '400' }}>{fmt(actual)}</td>
      <td style={{ ...tdStyle('right'), fontFamily: 'var(--font-mono)', fontWeight: bold ? '600' : '400', color: ouColor || 'var(--text-3)' }}>
        {ou === null ? '—' : fmt(ou)}
      </td>
      <td style={tdStyle()} />
    </tr>
  )
}
