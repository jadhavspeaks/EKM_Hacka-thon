import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboard, triggerSync, getAnalyticsStats, getSyncSourcesMeta, testSharePoint } from '../api'
import { Spinner } from '../components/UI'
import { RefreshCw, TrendingUp, TrendingDown, Minus, AlertTriangle,
         CheckCircle2, Clock, Database, Search, Activity,
         Users, FileText, Zap, ChevronRight, Settings, ChevronDown, ChevronUp, Check,
         Wifi, WifiOff, AlertCircle } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

const T = {
  bg:'#07111f', bgCard:'#0d1f35', bgMid:'#0a1628',
  border:'#1a3050', borderLt:'#1e3a5e',
  teal:'#00d4aa', tealDk:'#00a88a',
  orange:'#ff6b35', red:'#f43f5e', green:'#10d98a', gold:'#f59e0b',
  purple:'#818cf8', blue:'#3b82f6',
  textPri:'#e2eaf4', textSec:'#6b8aad', textDim:'#3d5a7a',
}

const SRC = {
  confluence:{ label:'Confluence', color:'#818cf8', dot:'#818cf8' },
  jira:      { label:'Jira',       color:'#ff6b35', dot:'#ff6b35' },
  github:    { label:'GitHub',     color:'#94a3b8', dot:'#94a3b8' },
  sharepoint:{ label:'SharePoint', color:'#3b82f6', dot:'#3b82f6' },
}

function Spark({ values=[], color=T.teal, h=28, w=80 }) {
  if (values.length < 2) return null
  const max = Math.max(...values, 1)
  const pts = values.map((v,i)=>{
    const x=(i/(values.length-1))*w
    const y=h-2-((v/max)*(h-4))
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const last=pts.split(' ').at(-1).split(',')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id={`g${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#g${color.replace('#','')})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={color}/>
    </svg>
  )
}

function Beacon({ status }) {
  const col = status==='success'||status==='idle' ? T.green : status==='error'||status==='failed' ? T.red : T.gold
  return (
    <span className="relative inline-flex">
      <span className="w-2 h-2 rounded-full" style={{backgroundColor:col}}/>
      {(status==='success'||status==='idle') && (
        <span className="absolute inset-0 w-2 h-2 rounded-full animate-ping"
          style={{backgroundColor:col,opacity:0.4}}/>
      )}
    </span>
  )
}

function KPI({label,value,sub,trendVal,accent=T.teal,sparkVals,onClick,icon:Icon}) {
  const pos=trendVal>0,neg=trendVal<0
  return (
    <div onClick={onClick}
      className={`relative overflow-hidden rounded-xl p-5 flex flex-col gap-3 transition-all duration-200 ${onClick?'cursor-pointer hover:scale-[1.02]':''}`}
      style={{background:`linear-gradient(135deg, ${T.bgCard} 0%, ${T.bgMid} 100%)`,border:`1px solid ${T.border}`}}>
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{background:accent}}/>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{background:accent+'18',border:`1px solid ${accent}30`}}>
              <Icon size={15} style={{color:accent}}/>
            </div>
          )}
          <span className="text-xs font-medium uppercase tracking-widest"
            style={{color:T.textSec,fontFamily:"'DM Mono',monospace"}}>{label}</span>
        </div>
        {trendVal!==undefined && (
          <span className="flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded"
            style={{background:pos?T.green+'18':neg?T.red+'18':T.textDim+'40',
                    color:pos?T.green:neg?T.red:T.textSec}}>
            {pos?<TrendingUp size={11}/>:neg?<TrendingDown size={11}/>:<Minus size={11}/>}
            {Math.abs(trendVal)}%
          </span>
        )}
      </div>
      <div>
        <div className="text-3xl font-bold leading-none"
          style={{color:T.textPri,fontFamily:"'DM Mono',monospace",letterSpacing:'-0.02em'}}>{value}</div>
        {sub&&<div className="text-xs mt-1.5" style={{color:T.textSec}}>{sub}</div>}
      </div>
      {sparkVals?.length>1&&<div className="mt-auto"><Spark values={sparkVals} color={accent} h={24} w={90}/></div>}
      {onClick&&<div className="absolute bottom-3 right-3 opacity-30"><ChevronRight size={14} style={{color:accent}}/></div>}
    </div>
  )
}

function SharePointTile({src, syncing, onSync}) {
  const cfg = SRC.sharepoint
  const isSyncing = syncing === src.source_type
  const isErr = src.sync_status === 'error' || src.sync_status === 'failed'

  const [testing, setTesting]       = useState(false)
  const [testResult, setTestResult] = useState(null) // null | {status, sites}

  const runTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const r = await testSharePoint()
      setTestResult(r.data)
    } catch(e) {
      setTestResult({ status: 'error', message: 'Connection test failed', sites: [] })
    } finally {
      setTesting(false)
    }
  }

  const statusIcon = testResult?.status === 'ok'
    ? <Wifi size={11} style={{color:T.green}}/>
    : testResult?.status === 'no_credentials' || testResult?.status === 'not_configured'
    ? <AlertCircle size={11} style={{color:T.gold}}/>
    : testResult
    ? <WifiOff size={11} style={{color:T.red}}/>
    : null

  return (
    <div className="rounded-xl flex flex-col overflow-hidden"
      style={{background:T.bgCard, border:`1px solid ${T.border}`}}>

      {/* Q2 banner if never synced */}
      {src.sync_status === 'never' && !testResult ? (
        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{backgroundColor:cfg.dot}}/>
              <span className="text-sm font-semibold" style={{color:T.textPri}}>{cfg.label}</span>
            </div>
            <Beacon status={src.sync_status}/>
          </div>
          <div className="text-xs px-3 py-2 rounded-lg"
            style={{background:T.gold+'15', border:`1px solid ${T.gold}30`, color:T.gold}}>
            Q2 2026 — Azure AD app registration pending
          </div>
          <div className="text-xs" style={{color:T.textDim}}>
            Or test NTLM auth directly → add credentials to <span className="font-mono" style={{color:T.teal}}>.env</span>
          </div>
          <button onClick={runTest} disabled={testing}
            className="w-full text-xs font-medium py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all"
            style={{background:testing?T.border:cfg.color+'15', border:`1px solid ${cfg.color+'40'}`,
                    color:testing?T.textDim:cfg.color}}>
            {testing
              ? <><RefreshCw size={11} className="animate-spin"/> Testing…</>
              : <><Wifi size={11}/> Test Connection</>
            }
          </button>
        </div>
      ) : (
        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{backgroundColor:cfg.dot}}/>
              <span className="text-sm font-semibold" style={{color:T.textPri}}>{cfg.label}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {statusIcon}
              <Beacon status={src.sync_status}/>
            </div>
          </div>

          {src.doc_count > 0 && (
            <div>
              <div className="text-2xl font-bold"
                style={{color:cfg.color, fontFamily:"'DM Mono',monospace", letterSpacing:'-0.02em'}}>
                {src.doc_count.toLocaleString()}
              </div>
              <div className="text-xs mt-0.5" style={{color:T.textDim}}>documents</div>
            </div>
          )}

          {src.last_sync && (
            <div className="text-xs flex items-center gap-1" style={{color:T.textDim}}>
              <Clock size={10}/>{format(new Date(src.last_sync), 'MMM d, HH:mm')}
            </div>
          )}

          {isErr && src.error_message && (
            <div className="text-xs px-2 py-1.5 rounded"
              style={{background:T.red+'15', border:`1px solid ${T.red}30`, color:T.red}}>
              {src.error_message}
            </div>
          )}

          <div className="flex gap-1.5">
            <button onClick={runTest} disabled={testing}
              className="flex-1 text-xs font-medium py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all"
              style={{background:T.border, color:T.textSec, border:`1px solid ${T.borderLt}`}}>
              {testing ? <><RefreshCw size={10} className="animate-spin"/> Testing…</> : <><Wifi size={10}/> Test</>}
            </button>
            {testResult?.status === 'ok' && (
              <button onClick={() => onSync(src.source_type)} disabled={!!syncing}
                className="flex-1 text-xs font-medium py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all"
                style={{background:isSyncing?T.border:cfg.color+'15',
                        border:`1px solid ${cfg.color+'40'}`, color:cfg.color}}>
                <RefreshCw size={10} className={isSyncing?'animate-spin':''}/>{isSyncing?'Syncing…':'Sync'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Test result panel */}
      {testResult && (
        <div style={{borderTop:`1px solid ${T.border}`, background:T.bgMid}}>
          {testResult.status === 'no_credentials' && (
            <div className="px-4 py-3 space-y-1">
              <div className="text-xs font-semibold" style={{color:T.gold}}>⚠️ Credentials not set</div>
              <div className="text-xs" style={{color:T.textDim}}>Add to <span className="font-mono" style={{color:T.teal}}>backend/.env</span>:</div>
              <div className="text-xs font-mono px-2 py-1.5 rounded"
                style={{background:T.bg, color:T.teal, border:`1px solid ${T.border}`}}>
                SHAREPOINT_USERNAME=firstname.lastname@citi.com<br/>
                SHAREPOINT_PASSWORD=your-windows-password
              </div>
            </div>
          )}
          {testResult.status === 'not_configured' && (
            <div className="px-4 py-3">
              <div className="text-xs font-semibold" style={{color:T.gold}}>⚠️ No sites configured</div>
              <div className="text-xs mt-1" style={{color:T.textDim}}>sharepoint_sites.txt is empty</div>
            </div>
          )}
          {testResult.sites?.map(site => (
            <div key={site.url} className="px-4 py-3" style={{borderBottom:`1px solid ${T.border}`}}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold" style={{
                  color: site.status === 'ok' ? T.green : site.status === 'auth_failed' ? T.red : T.gold
                }}>
                  {site.status === 'ok' ? '✅' : site.status === 'auth_failed' ? '❌' : '⚠️'} {site.name}
                </span>
                {site.title && <span className="text-xs" style={{color:T.textDim}}>{site.title}</span>}
              </div>
              {site.status === 'ok' && (
                <div className="text-xs space-y-0.5" style={{color:T.textDim}}>
                  {site.page_count !== undefined && <div>📄 {site.page_count} pages</div>}
                  {site.libraries?.length > 0 && (
                    <div>📁 Libraries: {site.libraries.join(', ')}</div>
                  )}
                </div>
              )}
              {site.message && (
                <div className="text-xs mt-1" style={{color:T.red}}>{site.message}</div>
              )}
            </div>
          ))}
          {testResult.status === 'ok' && (
            <div className="px-4 py-2 text-xs" style={{color:T.green}}>
              ✅ Ready to sync — click Sync above
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SourceTile({src, syncing, onSync, meta}) {
  const cfg = SRC[src.source_type] || SRC.confluence
  const isSyncing = syncing === src.source_type
  const isErr = src.sync_status === 'error' || src.sync_status === 'failed'
  const hasConfig = src.source_type === 'confluence' || src.source_type === 'jira'

  // Config panel state
  const [configOpen, setConfigOpen] = useState(false)
  const [selectedItems, setSelectedItems] = useState([])  // selected space/project keys

  const availableItems = src.source_type === 'confluence'
    ? (meta?.confluence_spaces || [])
    : src.source_type === 'jira'
    ? (meta?.jira_projects || [])
    : []

  const toggleItem = (key) => {
    setSelectedItems(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const handleSync = () => {
    const spaces   = src.source_type === 'confluence' ? selectedItems : []
    const projects = src.source_type === 'jira'       ? selectedItems : []
    onSync(src.source_type, spaces, projects)
  }

  const selectedLabel = selectedItems.length === 0
    ? 'All'
    : selectedItems.length === 1
    ? selectedItems[0]
    : `${selectedItems.length} selected`

  return (
    <div className="rounded-xl flex flex-col gap-0 overflow-hidden"
      style={{background:T.bgCard, border:`1px solid ${T.border}`}}>

      {/* Main tile */}
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{backgroundColor:cfg.dot}}/>
            <span className="text-sm font-semibold" style={{color:T.textPri}}>{cfg.label}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {hasConfig && availableItems.length > 0 && (
              <button onClick={() => setConfigOpen(o => !o)}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-all"
                style={{
                  background: configOpen ? T.teal+'20' : T.border+'60',
                  color: configOpen ? T.teal : T.textDim,
                  border: `1px solid ${configOpen ? T.teal+'40' : T.border}`
                }}
                title="Choose spaces / projects">
                <Settings size={10}/>
                <span>{selectedLabel}</span>
                {configOpen ? <ChevronUp size={9}/> : <ChevronDown size={9}/>}
              </button>
            )}
            <Beacon status={src.sync_status}/>
          </div>
        </div>

        <div>
          <div className="text-2xl font-bold"
            style={{color:cfg.color, fontFamily:"'DM Mono',monospace", letterSpacing:'-0.02em'}}>
            {src.doc_count?.toLocaleString() ?? '—'}
          </div>
          <div className="text-xs mt-0.5" style={{color:T.textDim}}>documents</div>
        </div>

        {src.last_sync && (
          <div className="text-xs flex items-center gap-1" style={{color:T.textDim}}>
            <Clock size={10}/>{format(new Date(src.last_sync), 'MMM d, HH:mm')}
          </div>
        )}
        {isErr && src.error_message && (
          <div className="text-xs px-2 py-1.5 rounded"
            style={{background:T.red+'15', border:`1px solid ${T.red}30`, color:T.red}}>
            {src.error_message}
          </div>
        )}

        <button onClick={handleSync} disabled={!!syncing}
          className="w-full text-xs font-medium py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all"
          style={{
            background: isSyncing ? T.border : cfg.color+'15',
            border: `1px solid ${isSyncing ? T.border : cfg.color+'40'}`,
            color: isSyncing ? T.textDim : cfg.color,
            cursor: syncing ? 'not-allowed' : 'pointer'
          }}>
          <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''}/>
          {isSyncing ? 'Syncing…' : selectedItems.length > 0 ? `Sync ${selectedLabel}` : 'Sync'}
        </button>
      </div>

      {/* ── Collapsible config panel ── */}
      {configOpen && availableItems.length > 0 && (
        <div style={{borderTop:`1px solid ${T.border}`, background:T.bgMid}}>
          <div className="px-3 py-2 flex items-center justify-between">
            <span className="text-xs font-semibold" style={{color:T.textSec}}>
              {src.source_type === 'confluence' ? 'Spaces' : 'Projects'}
            </span>
            <div className="flex gap-2">
              <button className="text-xs" style={{color:T.textDim}}
                onClick={() => setSelectedItems([])}>
                All
              </button>
              <span style={{color:T.border}}>·</span>
              <button className="text-xs" style={{color:T.textDim}}
                onClick={() => setSelectedItems(availableItems.map(i => i.key))}>
                Select all
              </button>
            </div>
          </div>
          <div className="px-3 pb-3 space-y-1 max-h-48 overflow-y-auto">
            {availableItems.map(item => {
              const isSelected = selectedItems.includes(item.key)
              return (
                <button key={item.key}
                  onClick={() => toggleItem(item.key)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all"
                  style={{
                    background: isSelected ? T.teal+'15' : 'transparent',
                    border: `1px solid ${isSelected ? T.teal+'40' : 'transparent'}`,
                  }}>
                  <div className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                    style={{
                      background: isSelected ? T.teal : T.border,
                      border: `1px solid ${isSelected ? T.teal : T.borderLt}`
                    }}>
                    {isSelected && <Check size={9} color="#fff"/>}
                  </div>
                  <span className="text-xs font-mono" style={{color: isSelected ? T.teal : T.textSec}}>
                    {item.key}
                  </span>
                  <span className="text-xs truncate flex-1" style={{color:T.textDim}}>
                    {item.name !== item.key ? item.name : ''}
                  </span>
                  {item.type && (
                    <span className="text-xs px-1.5 py-0.5 rounded shrink-0"
                      style={{background:T.border, color:T.textDim}}>
                      {item.type}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Loading state for meta */}
      {configOpen && hasConfig && availableItems.length === 0 && (
        <div className="px-4 py-3 flex items-center gap-2" style={{borderTop:`1px solid ${T.border}`}}>
          <RefreshCw size={11} className="animate-spin" style={{color:T.textDim}}/>
          <span className="text-xs" style={{color:T.textDim}}>Loading available {src.source_type === 'confluence' ? 'spaces' : 'projects'}…</span>
        </div>
      )}
    </div>
  )
}

function BarDay({day,total,max}) {
  const pct=total/Math.max(max,1)*100
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <span className="text-xs" style={{color:T.textDim,fontFamily:"'DM Mono',monospace"}}>{total||''}</span>
      <div className="w-full rounded-sm flex flex-col justify-end" style={{height:40}}>
        <div className="w-full rounded-sm transition-all duration-700"
          style={{height:`${Math.max(pct,2)}%`,background:`linear-gradient(to top, ${T.tealDk}, ${T.teal})`}}/>
      </div>
      <span className="text-xs" style={{color:T.textDim,fontFamily:"'DM Mono',monospace"}}>{day}</span>
    </div>
  )
}

function Shortcut({icon:Icon,label,sub,accent,onClick}) {
  return (
    <button onClick={onClick}
      className="rounded-xl p-3.5 text-left flex items-center gap-3 w-full transition-all duration-150 hover:scale-[1.01] group"
      style={{background:T.bgCard,border:`1px solid ${T.border}`}}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{background:accent+'18',border:`1px solid ${accent}35`}}>
        <Icon size={16} style={{color:accent}}/>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold leading-tight" style={{color:T.textPri}}>{label}</div>
        <div className="text-xs mt-0.5" style={{color:T.textSec}}>{sub}</div>
      </div>
      <ChevronRight size={14} className="shrink-0 opacity-0 group-hover:opacity-60 transition-opacity"
        style={{color:accent}}/>
    </button>
  )
}

export default function Dashboard() {
  const [data,setData]=useState(null)
  const [analytics,setAnalytics]=useState(null)
  const [loading,setLoading]=useState(true)
  const [syncing,setSyncing]=useState(null)
  const [forceFull,setForceFull]=useState(false)
  const [tick,setTick]=useState(new Date())
  const [syncMeta,setSyncMeta]=useState(null)
  const navigate=useNavigate()

  const load=async()=>{
    try {
      const [dash,stats]=await Promise.all([
        getDashboard(),
        getAnalyticsStats(30).catch(()=>({data:null})),
      ])
      setData(dash.data); setAnalytics(stats.data)
    } catch(e){console.error(e)} finally{setLoading(false)}
  }

  const loadMeta=async()=>{
    try {
      const res = await getSyncSourcesMeta()
      setSyncMeta(res.data)
    } catch(e){ console.warn('Could not load sync meta:', e) }
  }

  useEffect(()=>{load(); loadMeta()},[])
  useEffect(()=>{const t=setInterval(()=>setTick(new Date()),60000);return()=>clearInterval(t)},[])

  const goTo=(tab)=>navigate('/intelligence',{state:{tab}})
  const handleSync=async(src, spacesOverride=[], projectsOverride=[])=>{
    setSyncing(src||'all')
    try{
      await triggerSync(src, forceFull, spacesOverride, projectsOverride)
      await load()
    }finally{setSyncing(null)}
  }

  if(loading) return (
    <div className="flex items-center justify-center h-screen" style={{background:T.bg}}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{background:T.teal+'20',border:`1px solid ${T.teal}40`}}>
          <Zap size={20} style={{color:T.teal}}/>
        </div>
        <div className="text-sm" style={{color:T.textSec}}>Loading…</div>
      </div>
    </div>
  )

  const liveSrcs=(data?.sources||[]).filter(s=>s.source_type!=='servicenow'&&s.source_type!=='sharepoint')
  const allSrcs=(data?.sources||[]).filter(s=>s.source_type!=='servicenow')
  const total=liveSrcs.reduce((a,s)=>a+(s.doc_count||0),0)
  const searches=analytics?.total_searches??0
  const zeroR=analytics?.zero_result_queries?.length??0
  const topQ=analytics?.top_queries?.slice(0,8)??[]
  const daily=analytics?.daily_searches?.slice(-7)??[]
  const dailyVals=daily.map(d=>d.count||0)
  const dailyMax=Math.max(...dailyVals,1)
  const trend=dailyVals.length>3
    ? Math.round(((dailyVals.slice(-3).reduce((a,b)=>a+b,0)/3)-(dailyVals.slice(0,3).reduce((a,b)=>a+b,0)/3))
      /Math.max(dailyVals.slice(0,3).reduce((a,b)=>a+b,0)/3,1)*100)
    : 0
  const hasErr=liveSrcs.some(s=>s.sync_status==='error'||s.sync_status==='failed')
  const lastSync=allSrcs.reduce((l,s)=>(!s.last_sync?l:!l||new Date(s.last_sync)>new Date(l)?s.last_sync:l),null)
  const totalForPct=liveSrcs.reduce((a,s)=>a+(s.doc_count||0),0)

  return (
    <div className="min-h-screen" style={{background:T.bg,fontFamily:"'DM Sans',sans-serif"}}>

      {/* Top bar */}
      <div className="px-6 py-4 flex items-center justify-between"
        style={{borderBottom:`1px solid ${T.border}`,background:T.bgCard}}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{background:`linear-gradient(135deg,${T.teal},${T.tealDk})`}}>
            <Zap size={16} className="text-white"/>
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight" style={{color:T.textPri}}>
              Knowledge Intelligence Hub
            </h1>
            <p className="text-xs" style={{color:T.textSec,fontFamily:"'DM Mono',monospace"}}>
              {tick.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}
              {' · '}{lastSync?`Last sync ${formatDistanceToNow(new Date(lastSync),{addSuffix:true})}`:'Not yet synced'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{background:hasErr?T.red+'15':T.green+'15',border:`1px solid ${hasErr?T.red+'30':T.green+'30'}`}}>
            {hasErr?<AlertTriangle size={13} style={{color:T.red}}/>:<CheckCircle2 size={13} style={{color:T.green}}/>}
            <span className="text-xs font-medium" style={{color:hasErr?T.red:T.green}}>
              {hasErr?'Sync issues':'All healthy'}
            </span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div onClick={()=>setForceFull(f=>!f)}
              className="relative w-9 h-5 rounded-full transition-colors"
              style={{background:forceFull?T.orange:T.border,cursor:'pointer'}}>
              <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                style={{transform:forceFull?'translateX(1rem)':'translateX(2px)'}}/>
            </div>
            <span className="text-xs font-medium" style={{color:forceFull?T.orange:T.textDim}}>
              {forceFull?'Force Full':'Incremental'}
            </span>
          </label>
          <button onClick={()=>handleSync(null)} disabled={!!syncing}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{background:`linear-gradient(135deg,${T.teal},${T.tealDk})`,color:'#fff',opacity:syncing?.6:1}}>
            <RefreshCw size={14} className={syncing==='all'?'animate-spin':''}/>
            {syncing==='all'?'Syncing…':'Sync All'}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-5">

        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPI label="Total Documents" value={total.toLocaleString()}
            sub={`${liveSrcs.length} live sources`} accent={T.teal}
            sparkVals={liveSrcs.map(s=>s.doc_count||0)} icon={Database}/>
          <KPI label="Searches / 30d" value={searches.toLocaleString()}
            sub="Knowledge queries" trendVal={trend} accent={T.purple}
            sparkVals={dailyVals} icon={Search} onClick={()=>goTo('analytics')}/>
          <KPI label="Zero-Result Gaps" value={zeroR}
            sub="Unanswered queries" accent={zeroR>0?T.orange:T.green}
            icon={zeroR>0?AlertTriangle:CheckCircle2} onClick={()=>goTo('gaps')}/>
          <KPI label="At-Risk Experts" value={data?.experts_at_risk??'—'}
            sub="Inactive or vendor-only" accent={T.red}
            icon={Users} onClick={()=>goTo('experts')}/>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-12 gap-4">

          {/* Sources (5 cols) */}
          <div className="col-span-12 lg:col-span-5 space-y-4">

            {/* Composition bar */}
            <div className="rounded-xl p-4" style={{background:T.bgCard,border:`1px solid ${T.border}`}}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-widest"
                  style={{color:T.textSec,fontFamily:"'DM Mono',monospace"}}>Source Composition</span>
                <span className="text-xs" style={{color:T.textDim}}>{total.toLocaleString()} total</span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden gap-px mb-4">
                {liveSrcs.map((s,i)=>{
                  const cfg=SRC[s.source_type]||SRC.confluence
                  const pct=((s.doc_count||0)/Math.max(totalForPct,1))*100
                  return pct>0?(
                    <div key={i} className="h-full transition-all duration-700"
                      style={{width:`${pct}%`,background:cfg.color,minWidth:4}}/>
                  ):null
                })}
              </div>
              <div className="flex flex-wrap gap-4">
                {liveSrcs.map((s,i)=>{
                  const cfg=SRC[s.source_type]||SRC.confluence
                  const pct=((s.doc_count||0)/Math.max(totalForPct,1)*100).toFixed(0)
                  return (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{background:cfg.dot}}/>
                      <span className="text-xs" style={{color:T.textSec}}>{cfg.label}</span>
                      <span className="text-xs font-semibold"
                        style={{color:T.textPri,fontFamily:"'DM Mono',monospace"}}>{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Source tiles */}
            <div className="grid grid-cols-2 gap-3">
              {liveSrcs.map(src=>(
                src.source_type === 'sharepoint'
                  ? <SharePointTile key={src.source_type} src={src} syncing={syncing} onSync={handleSync}/>
                  : <SourceTile key={src.source_type} src={src} syncing={syncing} onSync={handleSync} meta={syncMeta}/>
              ))}
              <div className="rounded-xl p-4 flex flex-col gap-3"
                style={{background:T.bgCard,border:`1px dashed ${T.borderLt}`,opacity:0.45}}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"/>
                  <span className="text-sm font-semibold" style={{color:T.textSec}}>SharePoint</span>
                </div>
                <div className="text-2xl font-bold" style={{color:T.textDim,fontFamily:"'DM Mono',monospace"}}>—</div>
                <span className="text-xs" style={{color:'#3b82f6'}}>Q2 2026 · Azure AD required</span>
              </div>
            </div>
          </div>

          {/* Analytics (4 cols) */}
          <div className="col-span-12 lg:col-span-4 space-y-4">

            {/* Docs by Source — PROMINENT: full numbers + bars */}
            <div className="rounded-xl p-4" style={{background:T.bgCard,border:`1px solid ${T.border}`}}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-widest"
                  style={{color:T.textSec,fontFamily:"'DM Mono',monospace"}}>Docs by Source</span>
                <span className="text-xs font-bold"
                  style={{color:T.teal,fontFamily:"'DM Mono',monospace"}}>{total.toLocaleString()} total</span>
              </div>
              <div className="space-y-3">
                {liveSrcs.map((s,i)=>{
                  const cfg=SRC[s.source_type]||SRC.confluence
                  const pct=((s.doc_count||0)/Math.max(total,1)*100)
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium" style={{color:T.textSec}}>{cfg.label}</span>
                        <span className="text-sm font-bold" style={{color:cfg.color,fontFamily:"'DM Mono',monospace"}}>
                          {(s.doc_count||0).toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2 rounded-full" style={{background:T.border}}>
                        <div className="h-2 rounded-full transition-all duration-700"
                          style={{width:`${Math.max(pct,1)}%`,background:cfg.color}}/>
                      </div>
                      <div className="text-xs mt-0.5" style={{color:T.textDim}}>{pct.toFixed(1)}% of corpus</div>
                    </div>
                  )
                })}
              </div>
            </div>
            {/* Bar chart */}
            <div className="rounded-xl p-4" style={{background:T.bgCard,border:`1px solid ${T.border}`}}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-widest"
                  style={{color:T.textSec,fontFamily:"'DM Mono',monospace"}}>7-Day Search Volume</span>
                <span className="text-xs font-bold"
                  style={{color:T.teal,fontFamily:"'DM Mono',monospace"}}>
                  {dailyVals.reduce((a,b)=>a+b,0)}
                </span>
              </div>
              {daily.length>0?(
                <div className="flex items-end gap-1.5" style={{height:56}}>
                  {daily.map((d,i)=>(
                    <BarDay key={i} day={format(new Date(d.date),'EEE').slice(0,1)}
                      total={d.count||0} max={dailyMax}/>
                  ))}
                </div>
              ):(
                <div className="flex items-center justify-center" style={{height:56}}>
                  <span className="text-xs" style={{color:T.textDim}}>No data yet</span>
                </div>
              )}
            </div>

            {/* Top queries */}
            <div className="rounded-xl p-4" style={{background:T.bgCard,border:`1px solid ${T.border}`}}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-widest"
                  style={{color:T.textSec,fontFamily:"'DM Mono',monospace"}}>Top Queries</span>
                <button onClick={()=>goTo('analytics')}
                  className="text-xs flex items-center gap-0.5 hover:opacity-80"
                  style={{color:T.teal}}>all<ChevronRight size={11}/></button>
              </div>
              {topQ.length>0?(
                <div className="space-y-2">
                  {topQ.map((q,i)=>(
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded flex items-center justify-center text-xs font-bold shrink-0"
                        style={{background:T.teal+'20',color:T.teal,fontFamily:"'DM Mono',monospace"}}>
                        {i+1}
                      </span>
                      <span className="text-sm flex-1 truncate" style={{color:T.textPri}}>{q.query}</span>
                      <span className="text-xs shrink-0" style={{color:T.textDim,fontFamily:"'DM Mono',monospace"}}>
                        {q.count}×
                      </span>
                    </div>
                  ))}
                </div>
              ):(
                <div className="py-3 text-center text-xs" style={{color:T.textDim}}>
                  No queries yet
                </div>
              )}
            </div>


          </div>

          {/* Intelligence shortcuts (3 cols) */}
          <div className="col-span-12 lg:col-span-3 space-y-3">
            <span className="text-xs font-semibold uppercase tracking-widest block"
              style={{color:T.textSec,fontFamily:"'DM Mono',monospace"}}>
              Intelligence
            </span>
            <Shortcut icon={AlertTriangle} label="Risk & Vendors"    sub="Dependency alerts"      accent={T.red}    onClick={()=>goTo('risk')}/>
            <Shortcut icon={TrendingUp}    label="Velocity"          sub="12-month activity"      accent={T.teal}   onClick={()=>goTo('velocity')}/>
            <Shortcut icon={Users}         label="Experts At Risk"   sub="Inactive SMEs"          accent={T.orange} onClick={()=>goTo('experts')}/>
            <Shortcut icon={Activity}      label="Coverage Score"    sub="Grade A–F by system"    accent={T.gold}   onClick={()=>goTo('coverage')}/>
            <Shortcut icon={FileText}      label="Knowledge Gaps"    sub="Undocumented systems"   accent={T.purple} onClick={()=>goTo('gaps')}/>
            <Shortcut icon={CheckCircle2}  label="Health Report"     sub="Freshness & audit"      accent={T.green}  onClick={()=>goTo('health')}/>
            {zeroR>0&&(
              <div className="rounded-xl p-3 flex items-start gap-2"
                style={{background:T.orange+'12',border:`1px solid ${T.orange}30`}}>
                <AlertTriangle size={13} style={{color:T.orange,marginTop:2}}/>
                <div>
                  <div className="text-xs font-semibold" style={{color:T.orange}}>
                    {zeroR} unanswered topic{zeroR!==1?'s':''}
                  </div>
                  <button onClick={()=>goTo('gaps')} className="text-xs mt-1 underline" style={{color:T.orange}}>
                    View gaps →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
