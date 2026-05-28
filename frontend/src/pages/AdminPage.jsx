import { useState, useEffect, useRef } from 'react'
import { api } from '../api'

function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t) }, [])
  return (
    <div style={{ position:'fixed', top:18, right:18, zIndex:999, padding:'10px 20px', borderRadius:8,
      fontSize:13, fontWeight:500, boxShadow:'0 4px 20px rgba(0,0,0,.4)',
      background:type==='ok'?'var(--grn-bg)':'var(--red-bg)',
      border:`1px solid ${type==='ok'?'var(--grn-bd)':'var(--red-bd)'}`,
      color:type==='ok'?'var(--green)':'var(--red)' }}>
      {msg}
    </div>
  )
}

function TabBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding:'8px 18px', borderRadius:7, fontSize:13, fontWeight:500,
      background:active?'var(--blue-bg)':'transparent',
      color:active?'var(--blue)':'var(--text2)',
      border:active?'1px solid var(--blue-bd)':'1px solid transparent' }}>
      {label}
    </button>
  )
}

// ── Draggable Rules List ───────────────────────────────────────────────────────
function RuleList({ rules, onUpdate }) {
  const [dragIdx, setDragIdx]   = useState(null)
  const [overIdx, setOverIdx]   = useState(null)
  const dragNode = useRef(null)

  function onDragStart(e, i) {
    setDragIdx(i); dragNode.current = e.currentTarget
    e.dataTransfer.effectAllowed = 'move'
    setTimeout(() => { if(dragNode.current) dragNode.current.style.opacity='0.4' }, 0)
  }
  function onDragEnd() {
    if(dragNode.current) dragNode.current.style.opacity='1'
    setDragIdx(null); setOverIdx(null); dragNode.current=null
  }
  function onDragOver(e, i) { e.preventDefault(); setOverIdx(i) }
  function onDrop(e, i) {
    e.preventDefault()
    if (dragIdx === null || dragIdx === i) { onDragEnd(); return }
    const next = [...rules]
    const [moved] = next.splice(dragIdx, 1)
    next.splice(i, 0, moved)
    onUpdate(next)
    onDragEnd()
  }

  function editRule(i, val) {
    const next = [...rules]; next[i] = val; onUpdate(next)
  }
  function removeRule(i) { onUpdate(rules.filter((_,j)=>j!==i)) }

  if (rules.length === 0)
    return (
      <div style={{ padding:'16px', borderRadius:8, background:'rgba(255,255,255,.02)', border:'1px dashed var(--border)', textAlign:'center', color:'var(--text3)', fontSize:13 }}>
        No rules yet. Add one below.
      </div>
    )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {rules.map((rule, i) => (
        <div
          key={i}
          draggable
          onDragStart={e => onDragStart(e, i)}
          onDragEnd={onDragEnd}
          onDragOver={e => onDragOver(e, i)}
          onDrop={e => onDrop(e, i)}
          style={{
            display:'flex', alignItems:'center', gap:10,
            padding:'9px 13px', borderRadius:8, border:'1px solid',
            borderColor: overIdx===i ? 'var(--blue)' : 'var(--border)',
            background: overIdx===i ? 'var(--blue-bg)' : 'rgba(79,142,247,.04)',
            transition:'all .12s', cursor:'grab',
          }}
        >
          {/* Drag handle */}
          <span title="Drag to reorder" style={{ color:'var(--text3)', fontSize:16, cursor:'grab', flexShrink:0, userSelect:'none', letterSpacing:1 }}>⠿</span>

          {/* Rule number badge */}
          <span style={{ fontSize:11, fontWeight:700, padding:'2px 7px', borderRadius:4, background:'var(--blue-bg)', color:'var(--blue)', border:'1px solid var(--blue-bd)', flexShrink:0 }}>
            {i+1}
          </span>

          {/* Editable rule text */}
          <input
            value={rule}
            onChange={e => editRule(i, e.target.value)}
            style={{ flex:1, background:'transparent', border:'none', outline:'none', fontSize:13, color:'var(--text)', padding:'2px 0' }}
          />

          {/* Delete */}
          <button onClick={() => removeRule(i)}
            style={{ background:'transparent', color:'var(--text3)', fontSize:18, lineHeight:1, padding:0, flexShrink:0, opacity:.7 }}
            title="Remove rule">×</button>
        </div>
      ))}
    </div>
  )
}

// ── Admin Page ────────────────────────────────────────────────────────────────
export default function AdminPage({ user }) {
  const [tab,       setTab]       = useState('config')
  const [options,   setOptions]   = useState({ products:[], migrations:[] })
  const [selProd,   setSelProd]   = useState('')
  const [selMig,    setSelMig]    = useState('')
  const [cfg,       setCfg]       = useState({ system_context:'', rules:[] })
  const [cfgLoad,   setCfgLoad]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [newRule,   setNewRule]   = useState('')
  const [newProd,   setNewProd]   = useState('')
  const [newMigId,  setNewMigId]  = useState('')
  const [newMigLbl, setNewMigLbl] = useState('')
  const [users,     setUsers]     = useState([])
  const [newEmail,  setNewEmail]  = useState('')
  const [newName,   setNewName]   = useState('')
  const [newRole,   setNewRole]   = useState('user')
  const [toast,     setToast]     = useState(null)

  const ok  = m => setToast({ m, t:'ok'  })
  const err = m => setToast({ m, t:'err' })
  const sc  = (k,v) => setCfg(c=>({...c,[k]:v}))

  useEffect(()=>{
    api.getOptions().then(d=>{ setOptions(d); setSelProd(d.products?.[0]||''); setSelMig(d.migrations?.[0]?.id||'') }).catch(()=>err('Cannot reach backend'))
  },[])
  useEffect(()=>{ if(selProd&&selMig) loadCfg() },[selProd,selMig])
  useEffect(()=>{ if(tab==='users') loadUsers() },[tab])

  async function loadCfg() {
    setCfgLoad(true)
    try { const d=await api.getConfig(selProd,selMig); setCfg({system_context:d.system_context||'',rules:d.rules||[]}) }
    catch { setCfg({system_context:'',rules:[]}) }
    finally { setCfgLoad(false) }
  }
  async function saveCfg() {
    setSaving(true)
    try { await api.saveConfig({product:selProd,migration:selMig,...cfg}); ok('Configuration saved ✓') }
    catch { err('Save failed') }
    finally { setSaving(false) }
  }
  async function loadUsers() { try { setUsers(await api.listUsers()) } catch { err('Failed to load users') } }

  function addRule() { if(!newRule.trim()) return; sc('rules',[...cfg.rules,newRule.trim()]); setNewRule('') }

  async function addProduct() {
    if(!newProd.trim()) return
    const u={...options,products:[...(options.products||[]),newProd.trim()]}
    await api.saveOptions(u); setOptions(u); setNewProd(''); ok('Product added ✓')
  }
  async function removeProduct(p) {
    const u={...options,products:options.products.filter(x=>x!==p)}
    await api.saveOptions(u); setOptions(u); if(selProd===p) setSelProd(u.products[0]||'')
  }
  async function addMigration() {
    if(!newMigId.trim()||!newMigLbl.trim()) return
    const u={...options,migrations:[...(options.migrations||[]),{id:newMigId.trim(),label:newMigLbl.trim()}]}
    await api.saveOptions(u); setOptions(u); setNewMigId(''); setNewMigLbl(''); ok('Migration added ✓')
  }
  async function removeMigration(id) {
    const u={...options,migrations:options.migrations.filter(m=>m.id!==id)}
    await api.saveOptions(u); setOptions(u); if(selMig===id) setSelMig(u.migrations[0]?.id||'')
  }
  async function addUser() {
    if(!newEmail.trim()||!newName.trim()) { err('Email and name required'); return }
    try { await api.addUser({email:newEmail.trim(),name:newName.trim(),role:newRole}); ok('User added ✓'); setNewEmail(''); setNewName(''); setNewRole('user'); loadUsers() }
    catch(e) { err(e.message) }
  }
  async function deleteUser(email) {
    if(!confirm(`Remove ${email}?`)) return
    try { await api.deleteUser(email); ok('User removed'); loadUsers() }
    catch(e) { err(e.message) }
  }

  const SH = { fontSize:12, fontWeight:600, color:'var(--text)', marginBottom:14, paddingBottom:10, borderBottom:'1px solid var(--border)' }

  return (
    <div style={{ maxWidth:980, margin:'0 auto', padding:'28px 24px' }}>
      {toast&&<Toast msg={toast.m} type={toast.t} onDone={()=>setToast(null)}/>}

      <div style={{ marginBottom:22 }}>
        <h1 style={{ fontSize:22, fontWeight:700, marginBottom:6 }}>Admin Panel</h1>
        <p style={{ color:'var(--text2)', fontSize:13 }}>Configure LLM rules, manage users and products.</p>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:22 }}>
        <TabBtn label="LLM Configuration" active={tab==='config'} onClick={()=>setTab('config')}/>
        <TabBtn label="User Management"   active={tab==='users'}  onClick={()=>setTab('users')}/>
      </div>

      {/* ── LLM Config ── */}
      {tab==='config' && (
        <>
          {/* Products & Migrations */}
          <div className="card" style={{ marginBottom:18 }}>
            <div style={SH}>Products &amp; Migration Indicators</div>
            <div className="grid2">
              <div>
                <label>Products</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginBottom:10 }}>
                  {options.products?.map(p=>(
                    <span key={p} style={{ display:'inline-flex',alignItems:'center',gap:5,fontSize:12,padding:'4px 11px',borderRadius:20,background:'var(--blue-bg)',border:'1px solid var(--blue-bd)',color:'var(--blue)' }}>
                      {p}
                      <button onClick={()=>removeProduct(p)} style={{ background:'transparent',color:'var(--blue)',fontSize:14,lineHeight:1,padding:0,opacity:.7 }}>×</button>
                    </span>
                  ))}
                </div>
                <div style={{ display:'flex',gap:8 }}>
                  <input value={newProd} onChange={e=>setNewProd(e.target.value)} placeholder="New product" onKeyDown={e=>{if(e.key==='Enter')addProduct()}}/>
                  <button className="btn-s" style={{ whiteSpace:'nowrap',padding:'7px 12px' }} onClick={addProduct}>+ Add</button>
                </div>
              </div>
              <div>
                <label>Migrations</label>
                <div style={{ display:'flex',flexDirection:'column',gap:5,marginBottom:10 }}>
                  {options.migrations?.map(m=>(
                    <div key={m.id} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 10px',borderRadius:7,background:'var(--bg3)',border:'1px solid var(--border)' }}>
                      <span style={{ fontSize:12 }}><strong style={{ color:'var(--amber)' }}>{m.id}</strong><span style={{ color:'var(--text2)',marginLeft:7 }}>{m.label}</span></span>
                      <button onClick={()=>removeMigration(m.id)} style={{ background:'transparent',color:'var(--text3)',fontSize:16,lineHeight:1,padding:0 }}>×</button>
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex',gap:6 }}>
                  <input value={newMigId} onChange={e=>setNewMigId(e.target.value)} placeholder="ID e.g. M2" style={{ flex:'0 0 80px' }}/>
                  <input value={newMigLbl} onChange={e=>setNewMigLbl(e.target.value)} placeholder="Label" onKeyDown={e=>{if(e.key==='Enter')addMigration()}}/>
                  <button className="btn-s" style={{ whiteSpace:'nowrap',padding:'7px 10px' }} onClick={addMigration}>+ Add</button>
                </div>
              </div>
            </div>
          </div>

          {/* LLM Config */}
          <div className="card">
            <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:20,flexWrap:'wrap' }}>
              <span style={{ fontSize:14,fontWeight:600 }}>LLM Config</span>
              <span style={{ color:'var(--text3)' }}>—</span>
              <select value={selProd} onChange={e=>setSelProd(e.target.value)} style={{ width:'auto',padding:'6px 10px',fontSize:13 }}>
                {options.products?.map(p=><option key={p} value={p}>{p}</option>)}
              </select>
              <span style={{ color:'var(--text3)' }}>×</span>
              <select value={selMig} onChange={e=>setSelMig(e.target.value)} style={{ width:'auto',padding:'6px 10px',fontSize:13 }}>
                {options.migrations?.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
              {cfgLoad&&<span className="spinner" style={{ borderTopColor:'var(--blue)',borderColor:'rgba(79,142,247,.3)' }}/>}
              <button className="btn-d" style={{ marginLeft:'auto',padding:'6px 12px' }} onClick={()=>api.deleteConfig(selProd,selMig).then(()=>setCfg({system_context:'',rules:[]}))}>Delete config</button>
            </div>

            {/* System Context with MSD guidance */}
            <div style={{ marginBottom:6, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <label style={{ margin:0 }}>System Context</label>
              <span style={{ fontSize:11, color:'var(--text3)' }}>← Paste MSD details, domain knowledge, integration info here</span>
            </div>
            {/* Info box about what goes where */}
            <div style={{ marginBottom:10, padding:'10px 14px', borderRadius:8, background:'rgba(79,142,247,.06)', border:'1px solid var(--blue-bd)', fontSize:12, lineHeight:1.7, color:'var(--text2)' }}>
              <strong style={{ color:'var(--blue)' }}>System Context</strong> = Background domain knowledge the LLM reads to understand the system.
              <br/>📌 <strong>Paste MSD details here</strong> — e.g. <em>"MSD is Microsoft Dynamics 365. Cases are created in the Queue folder under the Service section. An email is triggered from Acturis to MSD with transaction type RN in subject line. The product type for Shops is eTrade Packages."</em>
              <br/>
              <strong style={{ color:'var(--amber)' }}>Rules (below)</strong> = Specific verification steps the LLM MUST include in every generated test case.
              <br/>📌 <em>e.g. "Verify email triggered from Acturis to MSD with RN in subject line"</em>
            </div>

            <textarea rows={5} value={cfg.system_context} onChange={e=>sc('system_context',e.target.value)}
              placeholder={`Domain knowledge for this product + migration.\n\nExample MSD entry:\nMSD (Microsoft Dynamics 365) receives notifications from Acturis via email triggers. Cases are created in Queue folder under Service section. Transaction type RN appears in email subject for renewals. Product type for Shops = eTrade Packages.`}
              style={{ marginBottom:20, fontFamily:'inherit', fontSize:13 }}/>

            {/* Rules with drag-and-drop */}
            <div style={{ ...SH, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                Rules
                <span style={{ fontSize:11, fontWeight:400, color:'var(--text3)', textTransform:'none' }}>
                  — mandatory verification steps in every TC • drag ⠿ to reorder
                </span>
              </span>
              <span style={{ fontSize:11, padding:'2px 9px', borderRadius:20, background:'var(--blue-bg)', color:'var(--blue)', border:'1px solid var(--blue-bd)', fontWeight:600 }}>
                {cfg.rules.length} rules
              </span>
            </div>

            <div style={{ marginBottom:12 }}>
              <RuleList rules={cfg.rules} onUpdate={r=>sc('rules',r)}/>
            </div>

            <div style={{ display:'flex',gap:8,marginBottom:22 }}>
              <input value={newRule} onChange={e=>setNewRule(e.target.value)}
                placeholder="Add a mandatory verification rule… e.g. Verify email triggered from Acturis to MSD"
                onKeyDown={e=>{if(e.key==='Enter')addRule()}}/>
              <button className="btn-add" style={{ whiteSpace:'nowrap' }} onClick={addRule}>+ Add Rule</button>
            </div>

            <button className="btn-p" onClick={saveCfg} disabled={saving} style={{ display:'inline-flex',alignItems:'center',gap:8 }}>
              {saving?<><span className="spinner"/> Saving…</>:'Save configuration'}
            </button>
          </div>
        </>
      )}

      {/* ── Users ── */}
      {tab==='users' && (
        <div className="card">
          <div style={SH}>Registered Users</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto auto', gap:8, marginBottom:20 }}>
            <div><label>Email</label><input value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="user@company.com" onKeyDown={e=>{if(e.key==='Enter')addUser()}}/></div>
            <div><label>Name</label><input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Full name"/></div>
            <div><label>Role</label>
              <select value={newRole} onChange={e=>setNewRole(e.target.value)} style={{ width:'auto',minWidth:100 }}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div style={{ display:'flex',alignItems:'flex-end' }}>
              <button className="btn-p" style={{ padding:'10px 16px',whiteSpace:'nowrap' }} onClick={addUser}>+ Add User</button>
            </div>
          </div>
          <div style={{ overflowX:'auto',borderRadius:9,border:'1px solid var(--border)' }}>
            <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
              <thead><tr>
                {['Name','Email','Role','Added','Action'].map(h=>(
                  <th key={h} style={{ background:'var(--bg3)',color:'var(--text2)',fontSize:11,fontWeight:600,letterSpacing:'.05em',textTransform:'uppercase',padding:'10px 16px',textAlign:'left',borderBottom:'2px solid var(--blue-bd)' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {users.length===0
                  ? <tr><td colSpan={5} style={{ padding:'20px',textAlign:'center',color:'var(--text3)' }}>No users</td></tr>
                  : users.map(u=>(
                    <tr key={u.email} style={{ borderBottom:'1px solid var(--border)' }}>
                      <td style={{ padding:'11px 16px' }}>{u.name}</td>
                      <td style={{ padding:'11px 16px',color:'var(--text2)' }}>{u.email}</td>
                      <td style={{ padding:'11px 16px' }}>
                        <span style={{ fontSize:11,fontWeight:600,padding:'2px 9px',borderRadius:20,
                          background:u.role==='admin'?'var(--pur-bg)':'var(--blue-bg)',
                          color:u.role==='admin'?'var(--purple)':'var(--blue)',
                          border:`1px solid ${u.role==='admin'?'var(--pur-bd)':'var(--blue-bd)'}` }}>{u.role}</span>
                      </td>
                      <td style={{ padding:'11px 16px',color:'var(--text3)',fontSize:12 }}>
                        {u.created_at?new Date(u.created_at).toLocaleDateString():'-'}
                      </td>
                      <td style={{ padding:'11px 16px' }}>
                        <button className="btn-d" onClick={()=>deleteUser(u.email)}>Remove</button>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
