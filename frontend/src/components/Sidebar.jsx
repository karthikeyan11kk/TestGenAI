import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'

function fmtDate(iso) {
  if (!iso) return ''
  // MongoDB stores UTC without Z — add Z so JS parses as UTC not local time
  const normalized = iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z'
  const d = new Date(normalized)
  if (isNaN(d.getTime())) return ''
  const today = new Date()
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })
}

// ── TC History list ───────────────────────────────────────────────────────────
function TCHistory({ user, activeId, onLoad, onNew, refreshTrigger }) {
  const [history,  setHistory]  = useState([])
  const [query,    setQuery]    = useState('')
  const [prodFilt, setProdFilt] = useState('')
  const [options,  setOptions]  = useState({ products: [] })
  const [loading,  setLoading]  = useState(false)

  useEffect(() => { api.getOptions().then(setOptions).catch(() => {}) }, [])

  const fetch = useCallback(async () => {
    if (!user?.email) return
    setLoading(true)
    try {
      setHistory(await api.getHistory({
        user_email: user.email,
        q:          query    || undefined,
        product:    prodFilt || undefined,
      }))
    } catch { } finally { setLoading(false) }
  }, [user, query, prodFilt])

  useEffect(() => { fetch() }, [fetch, refreshTrigger])

  async function handleLoad(item) {
    try { onLoad(await api.getHistoryItem(item.id)) } catch { }
  }

  async function handleDelete(e, id) {
    e.stopPropagation()
    if (!confirm('Delete this test case?')) return
    await api.deleteHistoryItem(id)
    setHistory(h => h.filter(x => x.id !== id))
  }

  return (
    <>
      {/* Search */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 7 }}>
          <input value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') fetch() }}
            placeholder="Search TCs…"
            style={{ fontSize: 12, padding: '7px 10px', flex: 1 }} />
          <button onClick={onNew}
            style={{ background: 'var(--blue-bg)', color: 'var(--blue)', border: '1px solid var(--blue-bd)', padding: '5px 10px', fontSize: 11, borderRadius: 6, fontWeight: 600, whiteSpace: 'nowrap' }}>
            + New
          </button>
        </div>
        <select value={prodFilt} onChange={e => setProdFilt(e.target.value)}
          style={{ fontSize: 12, padding: '6px 10px', width: '100%' }}>
          <option value="">All products</option>
          {options.products?.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {loading && <div style={{ padding: '12px 8px', textAlign: 'center' }}><span className="spinner" style={{ width: 14, height: 14, borderTopColor: 'var(--blue)', borderColor: 'rgba(79,142,247,.2)' }} /></div>}
        {!loading && history.length === 0 && (
          <div style={{ padding: '20px 8px', textAlign: 'center', color: 'var(--text3)', fontSize: 12, lineHeight: 1.7 }}>
            {query || prodFilt ? 'No results.' : 'No test cases yet.\nGenerate one to start.'}
          </div>
        )}
        {history.map(item => (
          <div key={item.id}
            className={`hist-item ${activeId === item.id ? 'active' : ''}`}
            onClick={() => handleLoad(item)}
            style={{ position: 'relative' }}>
            <div className="hist-item-title">{item.testTitle || 'Untitled TC'}</div>
            <div className="hist-item-meta">
              <span style={{ color: 'var(--amber)', fontWeight: 600 }}>{item.product}</span>
              <span style={{ color: 'var(--purple)', fontWeight: 600 }}>{item.migration}</span>
              <span>{item.step_count} steps</span>
              <span style={{ marginLeft: 'auto' }}>{fmtDate(item.created_at)}</span>
            </div>
            {item.refined && <div style={{ fontSize: 10, color: 'var(--green)', marginTop: 2 }}>✦ Refined</div>}
            <button onClick={e => handleDelete(e, item.id)}
              style={{ position: 'absolute', top: 8, right: 6, background: 'transparent', color: 'var(--text3)', fontSize: 16, lineHeight: 1, padding: 0, opacity: .6 }}>
              ×
            </button>
          </div>
        ))}
      </div>
    </>
  )
}

// ── Matrix History list ───────────────────────────────────────────────────────
function MatrixHistory({ user, refreshTrigger }) {
  const [history,  setHistory]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => { fetchHistory() }, [user, refreshTrigger])

  async function fetchHistory() {
    if (!user?.email) return
    setLoading(true)
    try { setHistory(await api.getMatrixHistory(user.email)) } catch { }
    finally { setLoading(false) }
  }

  async function handleDownload(item) {
    try {
      const blob = await api.downloadMatrixHistory(item.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = item.filename || `matrix_${item.id}.xlsx`
      a.click(); URL.revokeObjectURL(url)
    } catch (e) { alert('Download failed: ' + e.message) }
  }

  async function handleDelete(e, id) {
    e.stopPropagation()
    if (!confirm('Delete this matrix from history?')) return
    setDeleting(id)
    try { await api.deleteMatrixHistory(id); setHistory(h => h.filter(x => x.id !== id)) } catch { }
    finally { setDeleting(null) }
  }

  return (
    <>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.5 }}>
          Previously generated matrix files. Click Download to re-export.
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {loading && <div style={{ padding: '12px 8px', textAlign: 'center' }}><span className="spinner" style={{ width: 14, height: 14, borderTopColor: 'var(--green)', borderColor: 'rgba(62,207,142,.2)' }} /></div>}
        {!loading && history.length === 0 && (
          <div style={{ padding: '20px 8px', textAlign: 'center', color: 'var(--text3)', fontSize: 12, lineHeight: 1.7 }}>
            No matrices generated yet.<br />Upload a requirements Excel in the Matrix Design tab.
          </div>
        )}
        {history.map(item => (
          <div key={item.id}
            style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(255,255,255,.02)', marginBottom: 7, position: 'relative' }}>
            {/* Filename */}
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 5, paddingRight: 20, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              📊 {item.original_filename || item.filename}
            </div>
            {/* Badges */}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'var(--blue-bg)', color: 'var(--blue)', border: '1px solid var(--blue-bd)', fontWeight: 600 }}>
                {item.requirements_count} reqs
              </span>
              <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'var(--grn-bg)', color: 'var(--green)', border: '1px solid var(--grn-bd)', fontWeight: 600 }}>
                {item.scenarios_count} scenarios
              </span>
              <span style={{ fontSize: 10, color: 'var(--text3)', alignSelf: 'center' }}>{fmtDate(item.created_at)}</span>
            </div>
            {/* Scenario names preview */}
            {item.scenario_names?.length > 0 && (
              <div style={{ fontSize: 10, color: 'var(--text3)', lineHeight: 1.5, marginBottom: 8 }}>
                {item.scenario_names.slice(0, 2).join(' · ')}
                {item.scenario_names.length > 2 && ` +${item.scenario_names.length - 2} more`}
              </div>
            )}
            {/* Actions */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn-excel" style={{ padding: '5px 10px', fontSize: 11, flex: 1, justifyContent: 'center' }}
                onClick={() => handleDownload(item)}>
                ⬇ Download
              </button>
              <button className="btn-d" style={{ padding: '5px 10px', fontSize: 11 }}
                disabled={deleting === item.id}
                onClick={e => handleDelete(e, item.id)}>
                {deleting === item.id ? <span className="spinner" style={{ width: 10, height: 10 }} /> : 'Del'}
              </button>
            </div>
            {/* delete ×  top right */}
          </div>
        ))}
      </div>
    </>
  )
}

// ── Sidebar with tabs ─────────────────────────────────────────────────────────
export default function Sidebar({ user, activeId, onLoad, onNew, refreshTrigger, matrixRefreshTrigger }) {
  const [collapsed,  setCollapsed]  = useState(false)
  const [activeTab,  setActiveTab]  = useState('tc')  // 'tc' | 'matrix'

  if (collapsed) {
    return (
      <div style={{ width: 36, minWidth: 36, background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 12, gap: 12 }}>
        <button onClick={() => setCollapsed(false)} title="Expand"
          style={{ background: 'transparent', color: 'var(--text3)', fontSize: 18, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)', lineHeight: 1 }}>›</button>
        <span style={{ fontSize: 9, color: 'var(--text3)', writingMode: 'vertical-rl', letterSpacing: '.08em', textTransform: 'uppercase', marginTop: 8 }}>History</span>
      </div>
    )
  }

  return (
    <div className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>

      {/* ── Sidebar header with tabs ── */}
      <div style={{ padding: '10px 12px 0', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>History</span>
          <button onClick={() => setCollapsed(true)} title="Collapse"
            style={{ background: 'transparent', color: 'var(--text3)', fontSize: 16, padding: '3px 6px', borderRadius: 5, border: '1px solid var(--border)', lineHeight: 1 }}>‹</button>
        </div>

        {/* Tab buttons */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 0 }}>
          {[
            { key: 'tc',     label: '🧪 Test Cases' },
            { key: 'matrix', label: '📊 Matrix'     },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{
                flex: 1, padding: '6px 4px', fontSize: 11, fontWeight: 600, borderRadius: '6px 6px 0 0',
                background: activeTab === t.key ? 'var(--bg)' : 'transparent',
                color:      activeTab === t.key ? 'var(--blue)' : 'var(--text3)',
                border:     activeTab === t.key ? '1px solid var(--border)' : '1px solid transparent',
                borderBottom: activeTab === t.key ? '1px solid var(--bg)' : '1px solid var(--border)',
                marginBottom: activeTab === t.key ? '-1px' : 0,
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
        {activeTab === 'tc' && (
          <TCHistory user={user} activeId={activeId} onLoad={onLoad} onNew={onNew} refreshTrigger={refreshTrigger} />
        )}
        {activeTab === 'matrix' && (
          <MatrixHistory user={user} refreshTrigger={matrixRefreshTrigger} />
        )}
      </div>

    </div>
  )
}
