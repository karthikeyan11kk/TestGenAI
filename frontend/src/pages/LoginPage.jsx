import { useState } from 'react'
import { api } from '../api'

export default function LoginPage({ onLogin }) {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) { setError('Please enter your email address.'); return }
    setError(''); setLoading(true)
    try {
      const user = await api.login(trimmed)
      onLogin(user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:32 }}>
          <div style={{ width:40, height:40, borderRadius:10, background:'linear-gradient(135deg,#4f8ef7,#7c5ef5)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:700, color:'#fff' }}>T</div>
          <div>
            <div style={{ fontSize:18, fontWeight:700, color:'var(--text)' }}>TestGen AI</div>
            <div style={{ fontSize:12, color:'var(--text2)' }}>E2E Test Case Generator</div>
          </div>
        </div>

        <div style={{ marginBottom:24 }}>
          <h2 style={{ fontSize:20, fontWeight:600, marginBottom:6 }}>Sign in</h2>
          <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.5 }}>
            Enter your registered email address to continue.
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom:18 }}>
            <label>Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoFocus
            />
          </div>

          {error && (
            <div style={{ marginBottom:16, padding:'10px 14px', borderRadius:7, background:'var(--red-bg)', border:'1px solid var(--red-bd)', color:'var(--red)', fontSize:13 }}>
              ⚠ {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-p"
            disabled={loading}
            style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}
          >
            {loading ? <><span className="spinner" /> Verifying…</> : 'Continue →'}
          </button>
        </form>

        <p style={{ marginTop:20, fontSize:12, color:'var(--text3)', textAlign:'center' }}>
          Access is restricted to registered users only.<br />
          Contact your administrator to get access.
        </p>

        {/* Default credentials hint */}
        <div style={{ marginTop:20, padding:'10px 14px', borderRadius:8, background:'rgba(79,142,247,.07)', border:'1px solid var(--blue-bd)', fontSize:12, color:'var(--text2)' }}>
          <strong style={{ color:'var(--blue)' }}>Default accounts:</strong><br />
          Admin: admin@testgen.com<br />
          User: user@testgen.com
        </div>
      </div>
    </div>
  )
}
