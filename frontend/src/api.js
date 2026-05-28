const BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '') + '/api'
  : '/api'

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, { headers: { 'Content-Type': 'application/json' }, ...opts })
  if (!res.ok) { const e = await res.json().catch(() => ({ detail: res.statusText })); throw new Error(e.detail || `Error ${res.status}`) }
  return res.json()
}
const qs = (p) => { const s=new URLSearchParams(Object.fromEntries(Object.entries(p).filter(([,v])=>v!=null&&v!=='&&'&&v!==false))).toString(); return s?'?'+s:'' }

export const api = {
  login:            (email)       => req('/auth/login', { method:'POST', body:JSON.stringify({ email }) }),
  getOptions:       ()            => req('/options'),
  saveOptions:      (b)           => req('/admin/options',  { method:'POST', body:JSON.stringify(b) }),
  getConfig:        (p,m)         => req(`/admin/config/${encodeURIComponent(p)}/${encodeURIComponent(m)}`),
  saveConfig:       (b)           => req('/admin/config',   { method:'POST', body:JSON.stringify(b) }),
  deleteConfig:     (p,m)         => req(`/admin/config/${encodeURIComponent(p)}/${encodeURIComponent(m)}`, { method:'DELETE' }),
  listUsers:        ()            => req('/admin/users'),
  addUser:          (b)           => req('/admin/users',    { method:'POST', body:JSON.stringify(b) }),
  deleteUser:       (email)       => req(`/admin/users/${encodeURIComponent(email)}`, { method:'DELETE' }),
  generate:         (b)           => req('/generate',       { method:'POST', body:JSON.stringify(b) }),
  refine:           (b)           => req('/refine',         { method:'POST', body:JSON.stringify(b) }),
  getHistory:       (p={})        => req('/history'+qs(p)),
  getHistoryItem:   (id)          => req(`/history/${id}`),
  deleteHistoryItem:(id)          => req(`/history/${id}`,  { method:'DELETE' }),
  llmStatus:        ()            => req('/llm/status'),

  // Matrix
  generateMatrix: async (file, userEmail) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('user_email', userEmail)
    const url = (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') + '/api' : '/api') + '/matrix'
    const res = await fetch(url, { method:'POST', body:fd })
    if (!res.ok) { const e=await res.json().catch(()=>({detail:res.statusText})); throw new Error(e.detail||'Matrix failed') }
    const historyId = res.headers.get('X-History-Id') || ''
    const blob = await res.blob()
    return { blob, historyId }
  },
  getMatrixHistory:       (email) => req(`/matrix/history?user_email=${encodeURIComponent(email)}`),
  downloadMatrixHistory:  (id)    => fetch(`${BASE}/matrix/history/${id}/download`).then(r=>{ if(!r.ok) throw new Error('Download failed'); return r.blob() }),
  deleteMatrixHistory:    (id)    => req(`/matrix/history/${id}`, { method:'DELETE' }),
}
