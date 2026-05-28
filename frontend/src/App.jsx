import { useState, useEffect } from 'react'
import { api } from './api'
import LoginPage from './pages/LoginPage'
import UserPage  from './pages/UserPage'
import AdminPage from './pages/AdminPage'

function Navbar({ user, status, onLogout }) {
  const online = status?.status === 'online'
  return (
    <nav style={{ background:'#161b27', borderBottom:'1px solid rgba(255,255,255,.08)', padding:'0 24px', height:56, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,#4f8ef7,#7c5ef5)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, color:'#fff' }}>T</div>
        <span style={{ fontSize:15, fontWeight:600, color:'#e8eaf0' }}>TestGen AI</span>
        <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, padding:'2px 9px', borderRadius:20, fontWeight:500,
          background: online?'rgba(62,207,142,.1)':'rgba(246,96,96,.1)',
          color: online?'#3ecf8e':'#f66060',
          border:`1px solid ${online?'rgba(62,207,142,.25)':'rgba(246,96,96,.25)'}` }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:online?'#3ecf8e':'#f66060', boxShadow:online?'0 0 5px #3ecf8e':'none' }} />
          {online ? `Groq · ${status.active_model}` : 'LLM offline'}
        </span>
      </div>

      {user && (
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:13, fontWeight:500, color:'var(--text)' }}>{user.name}</div>
            <div style={{ fontSize:11, color:'var(--text3)' }}>{user.email}</div>
          </div>
          <span style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20,
            background: user.role==='admin'?'var(--pur-bg)':'var(--blue-bg)',
            color: user.role==='admin'?'var(--purple)':'var(--blue)',
            border:`1px solid ${user.role==='admin'?'var(--pur-bd)':'var(--blue-bd)'}` }}>
            {user.role}
          </span>
          <button onClick={onLogout} style={{ background:'var(--red-bg)', color:'var(--red)', border:'1px solid var(--red-bd)', padding:'6px 14px', fontSize:12, borderRadius:7 }}>
            Logout
          </button>
        </div>
      )}
    </nav>
  )
}

export default function App() {
  const [user,   setUser]   = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('tg_user') || 'null') } catch { return null }
  })
  const [status, setStatus] = useState(null)

  useEffect(() => {
    checkLLM()
    const t = setInterval(checkLLM, 30000)
    return () => clearInterval(t)
  }, [])

  async function checkLLM() {
    try { setStatus(await api.llmStatus()) }
    catch { setStatus({ status:'offline' }) }
  }

  function handleLogin(u) {
    setUser(u)
    try { sessionStorage.setItem('tg_user', JSON.stringify(u)) } catch {}
  }

  function handleLogout() {
    setUser(null)
    try { sessionStorage.removeItem('tg_user') } catch {}
  }

  if (!user) return <LoginPage onLogin={handleLogin} />

  return (
    <>
      <Navbar user={user} status={status} onLogout={handleLogout} />
      {user.role === 'admin'
        ? <AdminPage user={user} />
        : <UserPage  user={user} />
      }
    </>
  )
}
