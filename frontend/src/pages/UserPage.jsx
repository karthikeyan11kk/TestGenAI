import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { api } from '../api'
import Sidebar from '../components/Sidebar'

// ── Helpers ───────────────────────────────────────────────────────────────────
function downloadExcel(data) {
  const rows = [['Test Title',data.testTitle||''],['Product',data.product||''],['Migration',data.migration||''],
    ['Preconditions',data.preconditions||''],['Generated On',new Date().toLocaleString()],[],
    ['Step No','Step','Expected Result'],...(data.steps||[]).map(s=>[s.stepNo,s.step,s.expectedResult])]
  const ws=XLSX.utils.aoa_to_sheet(rows); ws['!cols']=[{wch:12},{wch:55},{wch:55}]
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Test Case')
  XLSX.writeFile(wb,`TC_${(data.product||'').replace(/\s+/g,'_')}_${data.migration||''}_${Date.now()}.xlsx`)
}

function fmtDate(iso) {
  if (!iso) return ''
  const normalized = iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z'
  const d = new Date(normalized), t = new Date()
  if (isNaN(d.getTime())) return ''
  return d.toDateString()===t.toDateString()
    ? d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})
    : d.toLocaleDateString([],{month:'short',day:'numeric',year:'2-digit'})
}

function TabBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ padding:'9px 22px', borderRadius:7, fontSize:13, fontWeight:500,
      background:active?'var(--blue-bg)':'transparent', color:active?'var(--blue)':'var(--text2)',
      border:active?'1px solid var(--blue-bd)':'1px solid transparent', transition:'all .15s' }}>
      {label}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// REFINE PANEL
// ─────────────────────────────────────────────────────────────────────────────
function RefinePanel({ data, user, product, migration, acs, onRefined, onRegenerate, genLoading }) {
  const [feedback,setFeedback]=useState(''); const [refining,setRefining]=useState(false)
  const [error,setError]=useState(''); const inputRef=useRef(null); const busy=refining||genLoading
  async function handleRefine(e) {
    e.preventDefault(); if (!feedback.trim()) return; setError(''); setRefining(true)
    try {
      const result=await api.refine({ product,migration,user_email:user.email,feedback:feedback.trim(),
        previous_steps:data.steps||[],previous_title:data.testTitle||'',
        previous_preconditions:data.preconditions||'',acceptance_criteria:acs.filter(a=>a.trim()),
        history_id:data.history_id||data.id||'' })
      onRefined(result); setFeedback('')
    } catch(e){ setError(e.message) } finally { setRefining(false) }
  }
  const chips=['Add endorsement verification steps','Include Schedule document steps','Add DQI Tool XML verification','Add flood score read-only check']
  return (
    <div style={{ marginTop:18,padding:'16px 18px',borderRadius:10,background:'rgba(167,139,247,.06)',border:'1px solid rgba(167,139,247,.22)' }}>
      <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:12 }}>
        <span style={{ fontSize:13,fontWeight:600,color:'var(--text)' }}>Not satisfied?</span>
        <span style={{ fontSize:12,color:'var(--text2)' }}>Describe what to change, or regenerate</span>
      </div>
      <div style={{ display:'flex',gap:6,flexWrap:'wrap',marginBottom:12 }}>
        {chips.map(s=><button key={s} onClick={()=>{setFeedback(s);inputRef.current?.focus()}}
          style={{ fontSize:11,padding:'3px 10px',borderRadius:20,background:'var(--bg3)',color:'var(--text2)',border:'1px solid var(--border)',cursor:'pointer' }}>{s}</button>)}
      </div>
      <form onSubmit={handleRefine}>
        <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
          <input ref={inputRef} value={feedback} onChange={e=>setFeedback(e.target.value)}
            placeholder="e.g. Add steps to verify subsidence excess on Schedule document..." style={{ flex:1,minWidth:200 }} disabled={busy}/>
          <button type="submit" disabled={busy||!feedback.trim()} style={{ background:'var(--purple)',color:'#fff',padding:'9px 18px',borderRadius:'var(--r)',fontSize:13,fontWeight:500,whiteSpace:'nowrap',display:'inline-flex',alignItems:'center',gap:8 }}>
            {refining?<><span className="spinner"/> Refining…</>:'✦ Refine TC'}</button>
          <button type="button" onClick={onRegenerate} disabled={busy} style={{ background:'var(--amb-bg)',color:'var(--amber)',border:'1px solid var(--amb-bd)',padding:'9px 16px',borderRadius:'var(--r)',fontSize:13,fontWeight:500,whiteSpace:'nowrap',display:'inline-flex',alignItems:'center',gap:6 }}>
            {genLoading?<><span className="spinner" style={{ borderTopColor:'var(--amber)' }}/> Regenerating…</>:'↺ Regenerate'}</button>
        </div>
        {error&&<div style={{ marginTop:8,padding:'8px 12px',borderRadius:7,background:'var(--red-bg)',border:'1px solid var(--red-bd)',color:'var(--red)',fontSize:12 }}>⚠ {error}</div>}
      </form>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TC RESULT TABLE
// ─────────────────────────────────────────────────────────────────────────────
function ResultTable({ data, user, product, migration, acs, onClear, onRefined, onRegenerate, loading }) {
  const [copied,setCopied]=useState(false)
  const copy=()=>{ const rows=(data.steps||[]).map(s=>`${s.stepNo}\t${s.step}\t${s.expectedResult}`).join('\n')
    navigator.clipboard.writeText(`${data.testTitle}\nPreconditions: ${data.preconditions}\n\nStep No\tStep\tExpected Result\n${rows}`)
      .then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2000) }) }
  return (
    <div className="card" style={{ marginTop:20 }}>
      <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14,gap:12,flexWrap:'wrap' }}>
        <div style={{ flex:1 }}>
          <h2 style={{ fontSize:16,fontWeight:700,marginBottom:5 }}>{data.testTitle}</h2>
          <p style={{ fontSize:12,color:'var(--text2)',lineHeight:1.5 }}><strong style={{ color:'var(--text)' }}>Preconditions: </strong>{data.preconditions}</p>
        </div>
        <div style={{ display:'flex',gap:7,flexShrink:0,flexWrap:'wrap' }}>
          <button className="btn-excel" onClick={()=>downloadExcel({...data,product,migration})}>⬇ Excel</button>
          <button className="btn-s" style={{ padding:'7px 12px',fontSize:12 }} onClick={copy}>{copied?'✓':'Copy'}</button>
          <button className="btn-d" onClick={onClear}>Clear</button>
        </div>
      </div>
      <div style={{ display:'flex',gap:7,marginBottom:14,flexWrap:'wrap' }}>
        {[{v:`${(data.steps||[]).length} Steps`,c:'var(--blue)'},{v:product,c:'var(--amber)'},{v:migration,c:'var(--purple)'},
          ...(data.refined?[{v:'Refined',c:'var(--green)'}]:[])].filter(b=>b.v).map(b=>(
          <span key={b.v} style={{ fontSize:11,padding:'3px 10px',borderRadius:20,background:'var(--bg3)',color:b.c,border:'1px solid var(--border)',fontWeight:600 }}>{b.v}</span>
        ))}
      </div>
      <div className="tc-wrap">
        <table className="tc-table">
          <thead><tr><th style={{ width:52 }}>#</th><th>Step</th><th>Expected Result</th></tr></thead>
          <tbody>
            {(data.steps||[]).map((s,i)=>{
              const step=s.step||s.action||s.description||''
              const exp=s.expectedResult||s.expected_result||s.expected||s.outcome||s.result||'—'
              return <tr key={s.stepNo||i}><td>{s.stepNo||i+1}</td><td>{step}</td><td style={{ color:exp==='—'?'var(--text3)':'var(--green)' }}>{exp}</td></tr>
            })}
          </tbody>
        </table>
      </div>
      <RefinePanel data={data} user={user} product={product} migration={migration} acs={acs}
        onRefined={onRefined} onRegenerate={onRegenerate} genLoading={loading}/>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST CASE DESIGN TAB
// ─────────────────────────────────────────────────────────────────────────────
function TestCaseDesignTab({ user, options, historyItem, activeId, setActiveId, refresh, setRefresh }) {
  const [product,setProduct]=useState(''); const [migration,setMigration]=useState('')
  const [acs,setAcs]=useState(['']); const [loading,setLoading]=useState(false)
  const [error,setError]=useState(''); const [result,setResult]=useState(null)
  const resultRef=useRef(null)
  useEffect(()=>{ if(options.products?.[0]&&!product) setProduct(options.products[0]) },[options])
  useEffect(()=>{ if(options.migrations?.[0]&&!migration) setMigration(options.migrations[0].id) },[options])
  useEffect(()=>{
    if(!historyItem) return
    setResult({ ...historyItem, product:historyItem.product||product, migration:historyItem.migration||migration })
    setTimeout(()=>resultRef.current?.scrollIntoView({behavior:'smooth',block:'start'}),150)
  },[historyItem])
  const updateAC=(i,v)=>{ const a=[...acs]; a[i]=v; setAcs(a) }
  const addAC=()=>setAcs(a=>[...a,''])
  const removeAC=(i)=>acs.length>1&&setAcs(a=>a.filter((_,j)=>j!==i))
  async function doGenerate() {
    const filled=acs.map(a=>a.trim()).filter(Boolean)
    if(!filled.length){ setError('Please enter at least one AC.'); return }
    setError(''); setLoading(true)
    try {
      const data=await api.generate({ product,migration,acceptance_criteria:filled,user_email:user.email })
      setResult({...data,product,migration}); setActiveId(data.history_id); setRefresh(r=>r+1)
      setTimeout(()=>resultRef.current?.scrollIntoView({behavior:'smooth',block:'start'}),150)
    } catch(e){ setError(e.message) } finally { setLoading(false) }
  }
  async function regenerate() {
    const filled=acs.map(a=>a.trim()).filter(Boolean); if(!filled.length) return
    setLoading(true)
    try {
      const data=await api.generate({ product,migration,acceptance_criteria:filled,user_email:user.email,history_id:activeId||'' })
      setResult({...data,product,migration}); setActiveId(data.history_id); setRefresh(r=>r+1)
    } catch(e){ setError(e.message) } finally { setLoading(false) }
  }
  function handleRefined(r){ setResult({...r,product:r.product||product,migration:r.migration||migration,refined:true}); setActiveId(r.history_id); setRefresh(x=>x+1) }
  return (
    <div>
      <div className="card">
        <div style={{ fontSize:12,fontWeight:600,color:'var(--text)',marginBottom:16,paddingBottom:10,borderBottom:'1px solid var(--border)' }}>Configuration</div>
        <div className="grid2" style={{ marginBottom:18 }}>
          <div><label>Product</label><select value={product} onChange={e=>setProduct(e.target.value)}>{options.products.map(p=><option key={p} value={p}>{p}</option>)}</select></div>
          <div><label>Migration Indicator</label><select value={migration} onChange={e=>setMigration(e.target.value)}>{options.migrations.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select></div>
        </div>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10 }}>
          <label style={{ margin:0 }}>Acceptance Criteria</label>
          <button className="btn-add" onClick={addAC} style={{ padding:'5px 12px',fontSize:12,display:'inline-flex',alignItems:'center',gap:4 }}>
            <span style={{ fontSize:16,lineHeight:1 }}>+</span> Add AC</button>
        </div>
        <div style={{ display:'flex',flexDirection:'column',gap:7,marginBottom:8 }}>
          {acs.map((ac,i)=>(
            <div key={i} style={{ display:'flex',gap:7,alignItems:'center' }}>
              <span style={{ fontSize:12,fontWeight:700,color:'var(--blue)',minWidth:38,textAlign:'right',flexShrink:0 }}>AC{i+1}</span>
              <input value={ac} onChange={e=>updateAC(i,e.target.value)} placeholder={`Acceptance criterion ${i+1}…`}
                onKeyDown={e=>{ if(e.key==='Enter'){e.preventDefault();addAC()} }}/>
              <button onClick={()=>removeAC(i)} disabled={acs.length===1}
                style={{ background:'transparent',color:acs.length===1?'var(--text3)':'var(--red)',fontSize:20,lineHeight:1,padding:'0 3px',minWidth:24,flexShrink:0 }}>×</button>
            </div>
          ))}
        </div>
        <p style={{ fontSize:11,color:'var(--text3)',marginBottom:18 }}>💡 Press <kbd style={{ background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:4,padding:'1px 5px',fontSize:11 }}>Enter</kbd> to add next AC</p>
        {error&&<div style={{ marginBottom:14,padding:'10px 14px',borderRadius:7,background:'var(--red-bg)',border:'1px solid var(--red-bd)',color:'var(--red)',fontSize:12 }}>⚠ {error}</div>}
        <button className="btn-p" onClick={doGenerate} disabled={loading} style={{ display:'inline-flex',alignItems:'center',gap:10 }}>
          {loading?<><span className="spinner"/> Generating…</>:`↗ Generate TC (${acs.filter(a=>a.trim()).length} ACs)`}</button>
        {loading&&<p style={{ marginTop:8,fontSize:11,color:'var(--text3)' }}>LLM processing — may take 20–60 seconds.</p>}
      </div>
      {result&&<div ref={resultRef}><ResultTable data={result} user={user} product={result.product||product} migration={result.migration||migration} acs={acs}
        onClear={()=>{ setResult(null); setActiveId(null) }} onRefined={handleRefined} onRegenerate={regenerate} loading={loading}/></div>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MATRIX DESIGN TAB
// ─────────────────────────────────────────────────────────────────────────────
function MatrixDesignTab({ user, onMatrixGenerated }) {
  const [file,setFile]=useState(null); const [loading,setLoading]=useState(false)
  const [error,setError]=useState(''); const [done,setDone]=useState(false)
  const [matrixRefresh,setMatrixRefresh]=useState(0)
  const fileRef=useRef(null)

  function handleFileChange(e) {
    const f = e.target.files?.[0]; if (!f) return
    setFile(f); setDone(false); setError('')
  }

  async function generateMatrix() {
    if(!file){ setError('Please upload an Excel file first.'); return }
    setError(''); setLoading(true); setDone(false)
    try {
      const { blob } = await api.generateMatrix(file, user.email)
      const url=URL.createObjectURL(blob); const a=document.createElement('a')
      a.href=url; a.download=`RequirementsMatrix_${Date.now()}.xlsx`; a.click(); URL.revokeObjectURL(url)
      setDone(true); onMatrixGenerated()
    } catch(e){ setError(e.message) } finally { setLoading(false) }
  }

  return (
    <div>
      <div className="card">
        <div style={{ fontSize:12,fontWeight:600,color:'var(--text)',marginBottom:16,paddingBottom:10,borderBottom:'1px solid var(--border)' }}>
          Matrix Configuration
        </div>

        {/* Info */}
        <div style={{ marginBottom:20,padding:'12px 16px',borderRadius:9,background:'var(--blue-bg)',border:'1px solid var(--blue-bd)' }}>
          <div style={{ fontSize:13,fontWeight:600,color:'var(--blue)',marginBottom:6 }}>How it works</div>
          <div style={{ fontSize:12,color:'var(--text2)',lineHeight:1.8 }}>
            Upload your requirements Excel with <strong style={{ color:'var(--text)' }}>columns A–H only</strong>:<br/>
            &nbsp;&nbsp;<span style={{ color:'var(--blue)' }}>A</span> = Functional Area &nbsp;·&nbsp;
            <span style={{ color:'var(--blue)' }}>B</span> = BA &nbsp;·&nbsp;
            <span style={{ color:'var(--blue)' }}>C</span> = Product/Sub-Area &nbsp;·&nbsp;
            <span style={{ color:'var(--blue)' }}>D</span> = Req ID<br/>
            &nbsp;&nbsp;<span style={{ color:'var(--blue)' }}>E</span> = Description &nbsp;·&nbsp;
            <span style={{ color:'var(--blue)' }}>F</span> = Requirement &nbsp;·&nbsp;
            <span style={{ color:'var(--blue)' }}>G</span> = AC/s &nbsp;·&nbsp;
            <span style={{ color:'var(--blue)' }}>H</span> = ACs Covered<br/>
            AI will generate scenario headings (columns I onwards) and map ACs automatically.
          </div>
        </div>

        {/* File upload */}
        <label style={{ marginBottom:8 }}>Requirements Excel (.xlsx)</label>
        <div onClick={()=>fileRef.current?.click()}
          onDragOver={e=>e.preventDefault()}
          onDrop={e=>{ e.preventDefault(); const f=e.dataTransfer.files[0]; if(f){ setFile(f); setDone(false); setError('') } }}
          style={{ border:`2px dashed ${file?'var(--grn-bd)':'var(--border2)'}`,borderRadius:10,padding:'32px 20px',textAlign:'center',cursor:'pointer',background:file?'var(--grn-bg)':'rgba(255,255,255,.02)',transition:'all .15s',marginBottom:16 }}>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display:'none' }} onChange={handleFileChange}/>
          {file ? (
            <div><div style={{ fontSize:26,marginBottom:6 }}>📊</div>
              <div style={{ fontSize:13,fontWeight:600,color:'var(--green)' }}>{file.name}</div>
              <div style={{ fontSize:11,color:'var(--text3)',marginTop:4 }}>{(file.size/1024).toFixed(1)} KB · click to change</div></div>
          ) : (
            <div><div style={{ fontSize:32,marginBottom:8 }}>📂</div>
              <div style={{ fontSize:13,fontWeight:500,color:'var(--text2)' }}>Click or drag & drop your Excel file here</div>
              <div style={{ fontSize:11,color:'var(--text3)',marginTop:4 }}>.xlsx or .xls · Columns A–H required</div></div>
          )}
        </div>



        {error&&<div style={{ marginBottom:14,padding:'10px 14px',borderRadius:7,background:'var(--red-bg)',border:'1px solid var(--red-bd)',color:'var(--red)',fontSize:12 }}>⚠ {error}</div>}
        {done&&<div style={{ marginBottom:14,padding:'10px 14px',borderRadius:7,background:'var(--grn-bg)',border:'1px solid var(--grn-bd)',color:'var(--green)',fontSize:13,fontWeight:500 }}>✓ Matrix generated, downloaded and saved to history!</div>}

        <button className="btn-p" onClick={generateMatrix} disabled={loading||!file} style={{ display:'inline-flex',alignItems:'center',gap:10 }}>
          {loading?<><span className="spinner"/> AI is generating matrix… (may take 60s)</>:'↗ Generate Matrix Excel'}
        </button>
        {loading&&<p style={{ marginTop:10,fontSize:12,color:'var(--text3)',lineHeight:1.6 }}>AI is reading requirements, generating scenario headings, and mapping ACs.<br/>This may take 30–90 seconds.</p>}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// USER PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function UserPage({ user }) {
  const [tab,setTab]=useState('tc'); const [options,setOptions]=useState({products:[],migrations:[]})
  const [activeId,setActiveId]=useState(null); const [refresh,setRefresh]=useState(0)
  const [historyItem,setHistoryItem]=useState(null); const [error,setError]=useState('')
  const [matrixRefresh,setMatrixRefresh]=useState(0)

  useEffect(()=>{ api.getOptions().then(setOptions).catch(()=>setError('Cannot reach backend.')) },[])

  function loadFromHistory(full) {
    setTab('tc'); setActiveId(full.id)
    setHistoryItem({...full, _ts:Date.now()})  // timestamp ensures useEffect fires
  }

  return (
    <div className="app-shell">
      {/* Left sidebar — TC history */}
      <Sidebar user={user} activeId={activeId} onLoad={loadFromHistory}
        onNew={()=>{ setActiveId(null); setHistoryItem(null); setTab('tc') }}
        refreshTrigger={refresh} matrixRefreshTrigger={matrixRefresh}/>

      {/* Main */}
      <div className="main-content">
        {error&&<div style={{ marginBottom:16,padding:'10px 14px',borderRadius:7,background:'var(--red-bg)',border:'1px solid var(--red-bd)',color:'var(--red)',fontSize:12 }}>⚠ {error}</div>}

        {/* Tabs */}
        <div style={{ display:'flex',gap:8,marginBottom:22,flexShrink:0 }}>
          <TabBtn label="🧪 Test Case Design" active={tab==='tc'}     onClick={()=>setTab('tc')}/>
          {/* <TabBtn label="📊 Matrix Design"    active={tab==='matrix'} onClick={()=>setTab('matrix')}/> */}
        </div>

        {tab==='tc'&&<TestCaseDesignTab user={user} options={options} historyItem={historyItem}
          activeId={activeId} setActiveId={setActiveId} refresh={refresh} setRefresh={setRefresh}/>}
        {tab==='matrix'&&<MatrixDesignTab user={user} onMatrixGenerated={()=>setMatrixRefresh(r=>r+1)}/>}
      </div>
    </div>
  )
}
