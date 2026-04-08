import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import AuthPage from './components/AuthPage'
import Layout from './components/Layout'
import LogExpense from './components/LogExpense'
import Ledger from './components/Ledger'
import Reconciliation from './components/Reconciliation'

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>Loading…</div>
      </div>
    )
  }

  if (!session) return <AuthPage />

  return (
    <Layout session={session}>
      <Routes>
        <Route path="/" element={<Navigate to="/log" replace />} />
        <Route path="/log" element={<LogExpense />} />
        <Route path="/ledger" element={<Ledger />} />
        <Route path="/reconciliation" element={<Reconciliation />} />
        <Route path="*" element={<Navigate to="/log" replace />} />
      </Routes>
    </Layout>
  )
}
