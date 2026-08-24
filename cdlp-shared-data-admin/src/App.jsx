import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'

const NAV = [
  ['dashboard','總覽'],['organizations','組織'],['projects','專案'],['locations','位置'],
  ['standard','標準工項'],['projectitems','專案工項'],['people','人員'],['vendors','廠商'],
]

const EMPTY = { organizations:[], projects:[], locations:[], standard:[], projectitems:[], people:[], vendors:[] }
const SNAPSHOT = { organizations:1, projects:1, standard:152, projectitems:152 }

function Table({ cols, rows }) {
  if (!rows?.length) return <div className="empty">目前沒有可顯示資料。</div>
  return <div className="table-wrap"><table><thead><tr>{cols.map(c=><th key={c[0]}>{c[1]}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={r._key||i}>{cols.map(c=><td key={c[0]} className={c[2]||''}>{String(r[c[0]] ?? '')}</td>)}</tr>)}</tbody></table></div>
}

export default function App(){
  const [view,setView]=useState('dashboard')
  const [session,setSession]=useState(null)
  const [mode,setMode]=useState('preview')
  const [notice,setNotice]=useState('未登入：顯示資料基線。登入且授權後才讀取 Supabase LIVE 資料。')
  const [busy,setBusy]=useState(false)
  const [authMode,setAuthMode]=useState('signin')
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [displayName,setDisplayName]=useState('')
  const [data,setData]=useState(EMPTY)
  const [search,setSearch]=useState('')
  const [stage,setStage]=useState('')
  const [pwiSearch,setPwiSearch]=useState('')
  const [selected,setSelected]=useState(new Set())
  const [projectId,setProjectId]=useState('')

  const loadLive=useCallback(async()=>{
    if(!session) return
    setBusy(true)
    try{
      const sources=[
        ['organizations','v_admin_organizations'],['projects','v_admin_projects'],['locations','v_admin_locations'],
        ['standard','v_admin_standard_work_items'],['projectitems','v_admin_project_work_items'],
        ['people','v_admin_people'],['vendors','v_admin_vendors']
      ]
      const next={}
      for(const [k,v] of sources){
        const {data:rows,error}=await supabase.from(v).select('*')
        if(error) throw error
        next[k]=rows||[]
      }
      if(!next.organizations.length && !next.projects.length){
        setMode('pending'); setData(EMPTY)
        setNotice('登入成功，但帳號尚未綁定 Organization / Project。RLS 正常生效，請由管理端授權。')
      }else{
        setMode('live'); setData(next)
        setNotice('LIVE｜資料由 Supabase security_invoker Views 即時讀取，寫入受 RLS 控制。')
      }
    }catch(e){ setMode('error'); setNotice('LIVE 讀取失敗：'+e.message) }
    finally{ setBusy(false) }
  },[session])

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>setSession(data.session))
    const {data:l}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s))
    return ()=>l.subscription.unsubscribe()
  },[])
  useEffect(()=>{ if(session) loadLive(); else {setMode('preview'); setData(EMPTY)} },[session,loadLive])

  const stages=useMemo(()=>[...new Set((data.standard||[]).map(x=>x.stage_code).filter(Boolean))].sort(),[data.standard])
  const std=useMemo(()=>{const q=search.toLowerCase();return (data.standard||[]).filter(x=>(!stage||x.stage_code===stage)&&(!q||[x.stage_code,x.boq_code,x.work_name,x.sub_work_name,x.standard_work_item_id].join(' ').toLowerCase().includes(q)))},[data.standard,search,stage])
  const pwi=useMemo(()=>{const q=pwiSearch.toLowerCase();return (data.projectitems||[]).filter(x=>!q||[x.project_work_item_id,x.project_code,x.boq_code,x.work_name,x.sub_work_name].join(' ').toLowerCase().includes(q))},[data.projectitems,pwiSearch])

  async function authSubmit(e){
    e.preventDefault(); if(!email||password.length<8){setNotice('Email 必填，密碼至少 8 碼。');return}
    setBusy(true)
    try{
      if(authMode==='signup'){
        const {data:r,error}=await supabase.auth.signUp({email,password,options:{data:{display_name:displayName||email.split('@')[0]}}})
        if(error) throw error
        setNotice(r.session?'註冊成功；帳號仍需 Organization / Project 授權。':'註冊已送出；若啟用 Email Confirm，請先完成驗證，再回來登入。')
      }else{
        const {error}=await supabase.auth.signInWithPassword({email,password}); if(error) throw error
      }
    }catch(e2){setNotice('Auth 失敗：'+e2.message)} finally{setBusy(false)}
  }

  function toggle(id){const n=new Set(selected);n.has(id)?n.delete(id):n.add(id);setSelected(n)}
  async function addToProject(){
    if(mode!=='live'||!projectId||!selected.size)return
    if(!confirm(`確定加入 ${selected.size} 個標準工項？`))return
    setBusy(true)
    const {data:r,error}=await supabase.rpc('cdlp_select_standard_work_items',{p_project_id:projectId,p_standard_work_item_ids:[...selected]})
    if(error)setNotice('專案選用失敗：'+error.message)
    else{setNotice(`專案選用完成：${r?.length??0} 筆。重複選用會維持原 ProjectWorkItemID。`);setSelected(new Set());await loadLive()}
    setBusy(false)
  }

  const counts=mode==='live'?{organizations:data.organizations.length,projects:data.projects.length,standard:data.standard.length,projectitems:data.projectitems.length}:SNAPSHOT
  const modeText=mode==='live'?'LIVE｜Supabase':mode==='pending'?'待授權':mode==='error'?'連線錯誤':'預覽模式'

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand">CDLP V7.1</div><div className="brand-sub">Shared Data 管理中心 V00</div><nav>{NAV.map(([id,label])=><button key={id} className={view===id?'active':''} onClick={()=>setView(id)}>{label}</button>)}</nav><div className="sidebar-note">Standalone First<br/>Optional Integration<br/>Shared ID + Local Fallback<br/><br/><b>StandardWorkItemID → ProjectWorkItemID</b></div></aside>
    <main>
      <header className="topbar"><div><h1>Shared Data 管理中心 V00</h1><p>React + Vite + Supabase Auth / RLS</p></div><div className={'mode '+mode}>{modeText}</div></header>
      <div className={'notice '+mode}>{busy?'處理中… ':''}{notice}</div>

      {!session?<section className="auth-card"><div className="auth-tabs"><button className={authMode==='signin'?'active':''} onClick={()=>setAuthMode('signin')}>登入</button><button className={authMode==='signup'?'active':''} onClick={()=>setAuthMode('signup')}>註冊</button></div><form onSubmit={authSubmit}>{authMode==='signup'&&<label>顯示名稱<input value={displayName} onChange={e=>setDisplayName(e.target.value)}/></label>}<label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>密碼<input type="password" value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="primary" disabled={busy}>{authMode==='signin'?'登入 Supabase':'建立帳號'}</button></form><p>新帳號不會自動取得 Organization / Project 權限。</p></section>:<div className="userbar"><span>{session.user.email}</span><button onClick={loadLive}>重新整理</button><button onClick={()=>supabase.auth.signOut()}>登出</button></div>}

      {view==='dashboard'&&<><div className="stats"><div className="stat"><b>{counts.organizations}</b><span>組織</span></div><div className="stat"><b>{counts.projects}</b><span>專案</span></div><div className="stat"><b>{counts.standard}</b><span>標準工項</span></div><div className="stat"><b>{counts.projectitems}</b><span>專案工項</span></div></div><section className="card"><h2>核心資料流</h2><p><b>company_standard_work_items</b> → 專案選用 → <b>project_work_items</b> → <b>ProjectWorkItemID</b> → SITE / QA / PM / PUR / COST / CON / BI</p></section></>}
      {view==='organizations'&&<section className="card"><h2>組織｜Organization</h2><Table cols={[["organization_code","代碼"],["organization_name","組織"],["organization_type","類型"],["project_count","專案"],["standard_work_item_count","標準工項"]]} rows={data.organizations}/></section>}
      {view==='projects'&&<section className="card"><h2>專案｜Project</h2><Table cols={[["project_code","代碼"],["project_name","專案"],["project_status","狀態"],["location_count","位置"],["project_work_item_count","ProjectWorkItem"],["member_count","成員"]]} rows={data.projects}/></section>}
      {view==='locations'&&<section className="card"><h2>位置｜Location</h2><Table cols={[["project_code","專案"],["location_type","類型"],["location_code","位置代碼"],["location_name","位置"]]} rows={data.locations}/></section>}
      {view==='people'&&<section className="card"><h2>人員｜People</h2><Table cols={[["display_name","姓名"],["job_title","職稱"],["email","Email"],["organization_role","角色"]]} rows={data.people}/></section>}
      {view==='vendors'&&<section className="card"><h2>廠商｜Vendor</h2><Table cols={[["vendor_code","代碼"],["vendor_name","廠商"],["vendor_type","類型"],["trade_code","工種"],["is_approved","核准"]]} rows={data.vendors}/></section>}
      {view==='standard'&&<section className="card"><div className="section-head"><h2>公司標準工項庫｜Standard WorkItem</h2><b>{std.length} / {data.standard.length}</b></div><div className="toolbar"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="搜尋階段／工料編號／工項／次工項"/><select value={stage} onChange={e=>setStage(e.target.value)}><option value="">全部階段</option>{stages.map(s=><option key={s}>{s}</option>)}</select></div><div className="selection-bar"><select value={projectId} onChange={e=>setProjectId(e.target.value)} disabled={mode!=='live'}><option value="">選擇專案</option>{data.projects.map(p=><option key={p.project_id} value={p.project_id}>{p.project_code}｜{p.project_name}</option>)}</select><span>已勾選 <b>{selected.size}</b></span><button onClick={()=>{const n=new Set(selected);std.forEach(x=>n.add(x.standard_work_item_id));setSelected(n)}}>勾選目前篩選</button><button onClick={()=>setSelected(new Set())}>清除</button><button className="primary" onClick={addToProject} disabled={mode!=='live'||!projectId||!selected.size}>加入選定專案</button></div><div className="table-wrap"><table><thead><tr><th>選</th><th>階段</th><th>工料編號</th><th>工項</th><th>次工項</th><th>StandardWorkItemID</th><th>已選專案數</th></tr></thead><tbody>{std.map(x=><tr key={x.standard_work_item_id}><td><input type="checkbox" checked={selected.has(x.standard_work_item_id)} onChange={()=>toggle(x.standard_work_item_id)}/></td><td>{x.stage_code}</td><td>{x.boq_code}</td><td>{x.work_name}</td><td>{x.sub_work_name}</td><td className="mono">{x.standard_work_item_id}</td><td>{x.selected_project_count}</td></tr>)}</tbody></table></div></section>}
      {view==='projectitems'&&<section className="card"><div className="section-head"><h2>專案工程項目｜Project WorkItem</h2><b>{pwi.length} / {data.projectitems.length}</b></div><div className="toolbar"><input value={pwiSearch} onChange={e=>setPwiSearch(e.target.value)} placeholder="搜尋 ProjectWorkItemID／工料編號／工項"/></div><Table cols={[["project_work_item_id","ProjectWorkItemID","mono"],["project_code","專案"],["stage_code","階段"],["boq_code","工料編號"],["work_name","工項"],["sub_work_name","次工項"],["source_type","來源"]]} rows={pwi}/></section>}
    </main>
  </div>
}
