import { NavLink } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const navItems = [
  { to: '/log', label: 'Log expense' },
  { to: '/ledger', label: 'Ledger' },
  { to: '/reconciliation', label: 'Reconciliation' },
]

export default function Layout({ children, session }) {
  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        background: 'var(--text)',
        color: '#fff',
        padding: '0 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '52px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '1rem',
          fontWeight: '500',
          letterSpacing: '-0.01em',
        }}>
          FieldLedger
        </div>
        <nav style={{ display: 'flex', gap: '0.25rem' }}>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                padding: '0.375rem 0.75rem',
                borderRadius: 'var(--radius)',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
                background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                textDecoration: 'none',
                transition: 'color 0.12s, background 0.12s',
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>
            {session?.user?.email}
          </span>
          <button
            onClick={signOut}
            style={{
              background: 'none', border: '1px solid rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.7)', borderRadius: 'var(--radius)',
              padding: '0.25rem 0.625rem', fontSize: '0.75rem', cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <main style={{ flex: 1, maxWidth: '900px', margin: '0 auto', width: '100%', padding: '1.5rem 1.25rem' }}>
        {children}
      </main>
    </div>
  )
}
