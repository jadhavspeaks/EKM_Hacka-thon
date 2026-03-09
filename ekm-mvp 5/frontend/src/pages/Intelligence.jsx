import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { getDashboard, getAnalyticsStats, getHealthReport, getRiskReport, getOnboardingPath, getKnowledgeGaps, getExpertsAtRisk, getCoverageReport, getVelocity, getHandover, getHandoverProgress, saveHandoverProgress, searchPeople, getPersonProfile, getConfig } from '../api'
import { Spinner, SourceBadge } from '../components/UI'
// -- Theme (inline) -------------------------------------------------------
const _tid = localStorage.getItem('ekm-theme') || 'arctic'
const T = _tid === 'slate' ? {
  id:'slate', bg:'#f4f6f8', bgCard:'#ffffff', bgMid:'#f8f9fa',
  border:'#dde3eb', borderLt:'#e4eaf2',
  blue:'#2563eb', blueLt:'#eff6ff', blueMid:'#dbeafe',
  teal:'#059669', tealDk:'#047857', tealLt:'#ecfdf5',
  orange:'#ea580c', red:'#f43f5e', green:'#10b981', gold:'#f59e0b', purple:'#8b5cf6',
  textPri:'#1e2a3a', textSec:'#4a6278', textDim:'#7a90a4',
  navBg:'#1e2a3a', navBorder:'#2d3d52', navText:'#7a90a4', navActive:'#e8edf2',
  navActiveBg:'#2d3d52', navActiveBorder:'#3a5068',
  font:"'IBM Plex Sans',sans-serif", mono:"'IBM Plex Mono',monospace",
} : {
  id:'arctic', bg:'#f4f6f9', bgCard:'#ffffff', bgMid:'#f8fafc',
  border:'#dde3ec', borderLt:'#e8edf4',
  blue:'#0052cc', blueLt:'#eff6ff', blueMid:'#dbeafe',
  teal:'#0891b2', tealDk:'#0e7490', tealLt:'#ecfeff',
  orange:'#ea580c', red:'#dc2626', green:'#16a34a', gold:'#d97706', purple:'#7c3aed',
  textPri:'#0d1117', textSec:'#4a5568', textDim:'#8896a7',
  navBg:'#ffffff', navBorder:'#e8edf4', navText:'#4a5568', navActive:'#0052cc',
  navActiveBg:'#eff6ff', navActiveBorder:'#dbeafe',
  font:"'IBM Plex Sans',sans-serif", mono:"'IBM Plex Mono',monospace",
}


// -- Helpers ------------------------------------------------------------------
const RISK_COLOR = {
  critical: 'text-red-600 bg-red-50 border-red-200',
  high:     'text-orange-600 bg-orange-50 border-orange-200',
  medium:   'text-yellow-600 bg-yellow-50 border-yellow-200',
  low:      'text-blue-700 bg-blue-50 border-green-200',
}
const RISK_ICON = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }
const HEALTH_COLOR = { good: 'text-blue-700', warning: 'text-yellow-600', poor: 'text-red-600' }
const HEALTH_ICON  = { good: '✅', warning: '⚠️', poor: '❌' }

// Teams deep link -- opens a chat with the person
function teamsLink(name, domain) {
  // Convert "Gandhi, Mihir [TECH]" -> "mihir.gandhi@citi.com" (best effort)
  const clean = name
    .replace(/\[TECH.*?\]/gi, '')
    .replace(/\(.*?\)/g, '')
    .trim()

  // Try "Lastname, Firstname" format
  const commaMatch = clean.match(/^([^,]+),\s*(.+)$/)
  if (commaMatch) {
    const last  = commaMatch[1].trim().toLowerCase().replace(/\s+/g, '.')
    const first = commaMatch[2].trim().toLowerCase().split(/\s+/)[0]
    return `https://teams.microsoft.com/l/chat/0/0?users=${first}.${last}@${domain}`
  }

  // Fallback: use full name as-is
  const email = clean.toLowerCase().replace(/\s+/g, '.') + '@' + domain
  return `https://teams.microsoft.com/l/chat/0/0?users=${email}`
}

function TeamsButton({ name, domain }) {
  if (!name || !domain) return null
  return (
    <a
      href={teamsLink(name, domain)}
      target="_blank"
      rel="noreferrer"
      onClick={e => e.stopPropagation()}
      className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full hover:bg-blue-100 transition-colors"
      title={`Chat with ${name} on Teams`}
    >
      💬 Teams
    </a>
  )
}

function StatCard({ label, value, sub, color = 'text-navy-800' }) {
  return (
    <div className="card p-4 text-center">
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-sm font-medium text-gray-700 mt-1">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

function SectionTitle({ children, sub }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold text-gray-900">{children}</h2>
      {sub && <p className="text-sm text-gray-500">{sub}</p>}
    </div>
  )
}

// -- Analytics Tab -------------------------------------------------------------
function AnalyticsTab() {
  const [searchData, setSearchData] = useState(null)
  const [corpusData, setCorpusData] = useState(null)
  const [loading, setLoading]       = useState(true)
  const [days, setDays]             = useState(30)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getAnalyticsStats(days).catch(() => ({ data: null })),
      getDashboard().catch(() => ({ data: null })),
    ]).then(([stats, dash]) => {
      setSearchData(stats.data)
      setCorpusData(dash.data)
      setLoading(false)
    })
  }, [days])

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>

  const data     = searchData
  const sources  = corpusData?.sources?.filter(s => s.source_type !== 'sharepoint') || []
  const totalDocs = sources.reduce((a, s) => a + (s.doc_count || 0), 0)

  const SRC_CFG = {
    confluence: { label: 'Confluence', color: '#7c3aed', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
    jira:       { label: 'Jira',       color: '#ea580c', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    github:     { label: 'GitHub',     color: '#475569', bg: 'bg-slate-50',  text: 'text-slate-700',  border: 'border-slate-200'  },
    sharepoint: { label: 'SharePoint', color: '#2563eb', bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200'   },
  }

  const maxVol  = Math.max(...(data?.daily_volume?.map(d => d.count) || [1]), 1)
  const maxDow  = Math.max(...(data?.dow_distribution?.map(d => d.count) || [1]), 1)
  const zeroRate = data?.zero_result_rate || 0
  const healthColor = zeroRate > 20 ? 'text-red-600 bg-red-50 border-red-200'
                    : zeroRate > 10  ? 'text-orange-600 bg-orange-50 border-orange-200'
                    : 'text-emerald-600 bg-emerald-50 border-emerald-200'

  return (
    <div className="space-y-6">

      {/* ── Section 1: Knowledge Corpus ─────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-slate-800">Knowledge Corpus</h2>
            <p className="text-xs text-slate-500 mt-0.5">Indexed documents across all connected sources</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-800" style={{fontFamily:"'IBM Plex Mono',monospace"}}>
              {totalDocs.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400">total documents</div>
          </div>
        </div>

        {/* Source breakdown — prominent cards */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          {sources.map(s => {
            const cfg = SRC_CFG[s.source_type] || SRC_CFG.confluence
            const pct = totalDocs > 0 ? ((s.doc_count || 0) / totalDocs * 100).toFixed(1) : '0'
            const lastSync = s.last_sync
              ? new Date(s.last_sync).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
              : 'Never'
            return (
              <div key={s.source_type}
                className={`rounded-xl border p-4 ${cfg.bg} ${cfg.border}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${cfg.text}`}>{cfg.label}</span>
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full border ${cfg.text} ${cfg.bg} ${cfg.border}`}>
                    {pct}%
                  </span>
                </div>
                <div className="text-2xl font-bold text-slate-800" style={{fontFamily:"'IBM Plex Mono',monospace"}}>
                  {(s.doc_count || 0).toLocaleString()}
                </div>
                <div className="text-xs text-slate-500 mt-1">docs · synced {lastSync}</div>
                <div className="mt-2 h-1 rounded-full bg-white/60">
                  <div className="h-1 rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: cfg.color }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Composition stacked bar */}
        <div className="card p-4">
          <div className="flex items-center gap-0.5 h-3 rounded-lg overflow-hidden mb-3">
            {sources.map(s => {
              const cfg = SRC_CFG[s.source_type] || SRC_CFG.confluence
              const pct = totalDocs > 0 ? ((s.doc_count || 0) / totalDocs * 100) : 0
              return pct > 0 ? (
                <div key={s.source_type} className="h-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: cfg.color, minWidth: 4 }} />
              ) : null
            })}
          </div>
          <div className="flex flex-wrap gap-4">
            {sources.map(s => {
              const cfg = SRC_CFG[s.source_type] || SRC_CFG.confluence
              const pct = totalDocs > 0 ? ((s.doc_count || 0) / totalDocs * 100).toFixed(0) : '0'
              return (
                <div key={s.source_type} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: cfg.color }} />
                  <span className="text-xs text-slate-600">{cfg.label}</span>
                  <span className="text-xs font-semibold text-slate-800" style={{fontFamily:"'IBM Plex Mono',monospace"}}>
                    {(s.doc_count || 0).toLocaleString()} <span className="text-slate-400 font-normal">({pct}%)</span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Section 2: Search Activity ──────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-slate-800">Search Activity</h2>
            <p className="text-xs text-slate-500 mt-0.5">Query behaviour and knowledge gap detection</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 mr-1">Period:</span>
            {[7, 30, 90].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-3 py-1 text-xs rounded-full border font-medium transition-colors ${
                  days === d
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-teal-400'
                }`}>
                {d}d
              </button>
            ))}
          </div>
        </div>

        {!data || data.total_searches === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-3xl mb-2">🔍</div>
            <p className="text-sm font-semibold text-slate-700">No search activity yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Search logs will appear here once users query the knowledge base.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* KPI strip */}
            <div className="grid grid-cols-4 gap-3">
              <div className="card p-4">
                <div className="text-2xl font-bold text-teal-600" style={{fontFamily:"'IBM Plex Mono',monospace"}}>
                  {data.total_searches.toLocaleString()}
                </div>
                <div className="text-xs font-medium text-slate-700 mt-1">Total Searches</div>
                <div className="text-xs text-slate-400">{data.days}-day window</div>
              </div>
              <div className="card p-4">
                <div className="text-2xl font-bold text-blue-600" style={{fontFamily:"'IBM Plex Mono',monospace"}}>
                  {data.unique_queries?.toLocaleString()}
                </div>
                <div className="text-xs font-medium text-slate-700 mt-1">Unique Queries</div>
                <div className="text-xs text-slate-400">distinct searches</div>
              </div>
              <div className={`card p-4 border ${healthColor}`}>
                <div className={`text-2xl font-bold ${healthColor.split(' ')[0]}`} style={{fontFamily:"'IBM Plex Mono',monospace"}}>
                  {zeroRate}%
                </div>
                <div className="text-xs font-medium text-slate-700 mt-1">Zero-Result Rate</div>
                <div className="text-xs text-slate-400">{data.zero_result_count} unanswered</div>
              </div>
              <div className="card p-4">
                <div className="text-2xl font-bold text-purple-600" style={{fontFamily:"'IBM Plex Mono',monospace"}}>
                  {data.total_searches > 0 ? (data.total_searches / data.days).toFixed(1) : '0'}
                </div>
                <div className="text-xs font-medium text-slate-700 mt-1">Avg / Day</div>
                <div className="text-xs text-slate-400">query frequency</div>
              </div>
            </div>

            {/* Daily volume chart */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-700">Daily Search Volume</h3>
                <span className="text-xs text-slate-400">{data.days} days · {data.total_searches} total</span>
              </div>
              {data.daily_volume?.some(d => d.count > 0) ? (
                <div className="flex items-end gap-px" style={{ height: 72 }}>
                  {data.daily_volume.map((d, i) => {
                    const h = Math.max(d.count > 0 ? 5 : 2, (d.count / maxVol) * 64)
                    const showLabel = i % Math.ceil(data.daily_volume.length / 7) === 0
                    return (
                      <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div className="w-full rounded-t transition-colors cursor-pointer"
                          style={{ height: `${h}px`,
                            background: d.count > 0 ? 'linear-gradient(to top, #0d9488, #2dd4bf)' : '#f1f5f9' }} />
                        {showLabel && (
                          <span className="text-slate-400 whitespace-nowrap" style={{ fontSize: 9 }}>
                            {new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                        <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10 shadow-lg pointer-events-none">
                          {d.date}: <strong>{d.count}</strong>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-16 text-xs text-slate-400 bg-slate-50 rounded-lg">
                  All searches logged today — chart builds over time
                </div>
              )}
            </div>

            {/* 2-col: Top queries + Zero-result gaps */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="card p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
                  🔥 Top Queries
                  <span className="text-xs font-normal text-slate-400">({data.days}d)</span>
                </h3>
                {data.top_queries?.length === 0 ? (
                  <p className="text-xs text-slate-400">No searches yet</p>
                ) : (
                  <div className="space-y-2">
                    {data.top_queries?.slice(0, 10).map((q, i) => {
                      const maxC = data.top_queries[0]?.count || 1
                      return (
                        <div key={q.query} className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 w-4 shrink-0 font-mono">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-xs text-slate-800 truncate">{q.query}</span>
                              <span className="text-xs font-semibold text-teal-600 ml-2 shrink-0">{q.count}×</span>
                            </div>
                            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-teal-400 rounded-full transition-all duration-500"
                                style={{ width: `${(q.count / maxC) * 100}%` }} />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="card p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-1">⚠️ Knowledge Gaps</h3>
                <p className="text-xs text-slate-400 mb-3">Queries that found nothing — document these</p>
                {data.zero_result_queries?.length === 0 ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
                    ✅ All searches returned results — no gaps detected
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.zero_result_queries?.map((q, i) => (
                      <div key={q.query}
                        className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
                        <span className="text-xs text-red-400 w-4 shrink-0 font-mono">{i + 1}</span>
                        <span className="text-xs text-slate-800 flex-1 truncate">{q.query}</span>
                        <span className="text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full shrink-0">
                          {q.count}× missed
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 3-col: source usage, day-of-week, recent searches */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="card p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">📂 Source Filter Usage</h3>
                <div className="space-y-2">
                  {(data.source_filter_usage || []).map(s => {
                    const maxF = data.source_filter_usage[0]?.count || 1
                    const C = { confluence:'#7c3aed', jira:'#ea580c', github:'#475569', sharepoint:'#2563eb', all:'#0d9488' }
                    return (
                      <div key={s.source} className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 w-20 shrink-0 capitalize">{s.source}</span>
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${(s.count / maxF) * 100}%`, background: C[s.source] || '#94a3b8' }} />
                        </div>
                        <span className="text-xs font-medium text-slate-600 w-5 text-right shrink-0">{s.count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {data.dow_distribution && (
                <div className="card p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">📅 By Day of Week</h3>
                  <div className="flex items-end gap-1" style={{ height: 48 }}>
                    {data.dow_distribution.map(d => (
                      <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div className="w-full rounded-t transition-all duration-500"
                          style={{ height: `${Math.max(d.count > 0 ? 4 : 2, (d.count / Math.max(maxDow, 1)) * 40)}px`,
                                   background: d.count > 0 ? '#818cf8' : '#f1f5f9' }} />
                        <span className="text-slate-400" style={{ fontSize: 9 }}>{d.day}</span>
                        {d.count > 0 && (
                          <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10 pointer-events-none">
                            {d.day}: {d.count}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="card p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">🕒 Recent Searches</h3>
                <div className="space-y-0.5">
                  {(data.recent_searches || []).slice(0, 8).map((s, i) => (
                    <div key={i} className="flex items-center gap-2 py-1 border-b border-slate-50 last:border-0">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.zero_result ? 'bg-red-400' : 'bg-emerald-400'}`} />
                      <span className="text-xs text-slate-700 flex-1 truncate">{s.query}</span>
                      <span className="text-xs text-slate-400 shrink-0">{s.results_count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


function HealthTab() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getHealthReport().then(r => { setData(r.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>
  if (!data)   return <div className="text-gray-500 text-sm">Could not load health report.</div>

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="Total Documents" value={data.total_docs?.toLocaleString()} color="text-teal-600" />
        <StatCard label="Jira–Confluence Links" value={`${data.audit?.linked_pct}%`}
          sub={`${data.audit?.linked_count} of ${data.audit?.jira_total} tickets`}
          color={data.audit?.linked_pct > 50 ? 'text-blue-700' : 'text-orange-500'} />
        <StatCard label="Stale Docs (180d+)" value={data.stale_docs?.length}
          color={data.stale_docs?.length > 20 ? 'text-red-500' : 'text-yellow-600'} />
      </div>

      {/* Freshness per source */}
      <div className="card p-4">
        <SectionTitle sub="% of documents updated within each time window">Content Freshness by Source</SectionTitle>
        <div className="space-y-3">
          {data.freshness?.map(f => (
            <div key={f.source} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SourceBadge type={f.source} />
                  <span className="text-sm text-gray-700">{f.total.toLocaleString()} docs</span>
                </div>
                <span className={`text-xs font-medium ${HEALTH_COLOR[f.health]}`}>
                  {HEALTH_ICON[f.health]} {f.health}
                </span>
              </div>
              <div className="flex gap-2 text-xs text-gray-500">
                <span className="text-blue-700 font-medium">{f.fresh_30d_pct}% &lt;30d</span>
                <span>·</span>
                <span className="text-blue-600 font-medium">{f.fresh_90d_pct}% &lt;90d</span>
                <span>·</span>
                <span>{f.fresh_365d_pct}% &lt;1yr</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-teal-500 h-2 rounded-full" style={{ width: `${f.fresh_90d_pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Knowledge audit */}
      <div className="card p-4">
        <SectionTitle sub="How well are Jira tickets documented in Confluence?">Knowledge Audit — Jira ↔ Confluence</SectionTitle>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="w-full bg-gray-100 rounded-full h-4">
              <div className="bg-teal-500 h-4 rounded-full transition-all"
                style={{ width: `${data.audit?.linked_pct || 0}%` }} />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span className="text-teal-600 font-medium">{data.audit?.linked_count} linked</span>
              <span className="text-red-400">{data.audit?.unlinked_count} unlinked</span>
            </div>
          </div>
          <div className={`text-2xl font-bold ${data.audit?.linked_pct > 50 ? 'text-blue-700' : 'text-orange-500'}`}>
            {data.audit?.linked_pct}%
          </div>
        </div>
      </div>

      {/* Stale docs */}
      {data.stale_docs?.length > 0 && (
        <div className="card p-4">
          <SectionTitle sub="Documents not updated in 180+ days">Stale Content</SectionTitle>
          <div className="space-y-2">
            {data.stale_docs.slice(0, 10).map((doc, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                <SourceBadge type={doc.source_type} />
                <a href={doc.url} target="_blank" rel="noreferrer"
                  className="text-sm text-blue-600 hover:underline flex-1 truncate">{doc.title}</a>
                <span className="text-xs text-red-400 shrink-0">{doc.days_old}d old</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Never searched */}
      {data.never_searched?.length > 0 && (
        <div className="card p-4">
          <SectionTitle sub="Indexed content that no one has ever searched for">Untouched Knowledge</SectionTitle>
          <div className="space-y-2">
            {data.never_searched.slice(0, 10).map((doc, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                <SourceBadge type={doc.source_type} />
                <a href={doc.url} target="_blank" rel="noreferrer"
                  className="text-sm text-blue-600 hover:underline flex-1 truncate">{doc.title}</a>
                <span className="text-xs text-gray-400 shrink-0">{doc.days_ingested}d ago</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// -- Risk Tab ------------------------------------------------------------------
function RiskTab({ teamsDomain }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')
  const [expanded, setExpanded] = useState({})

  useEffect(() => {
    getRiskReport().then(r => { setData(r.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const toggleExpand = (topic) =>
    setExpanded(prev => ({ ...prev, [topic]: !prev[topic] }))

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>
  if (!data)   return <div className="text-gray-500 text-sm">Could not load risk report.</div>

  const s = data.summary || {}
  const topics = (data.topics || []).filter(t => {
    if (filter === 'all') return true
    if (filter === 'vendor')   return t.vendor_pct > 50
    if (filter === 'internal') return t.internal_pct > 50
    return t.risk_level === filter
  })

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { key: 'critical', label: 'Critical Topics',      value: s.critical_topics,      color: 'red' },
          { key: 'high',     label: 'High Risk Topics',     value: s.high_risk_topics,     color: 'orange' },
          { key: 'vendor',   label: 'Vendor Contributors',  value: s.vendor_contributors,  color: 'purple', sub: `${s.vendor_pct}% of contributors` },
          { key: 'internal', label: 'Internal Contributors',value: s.internal_contributors, color: 'blue' },
        ].map(tile => {
          const active = filter === tile.key
          const BORDER = { red:'border-red-400', orange:'border-orange-400', purple:'border-purple-400', blue:'border-blue-400' }
          const BG     = { red:'bg-red-50', orange:'bg-orange-50', purple:'bg-purple-50', blue:'bg-blue-50' }
          const TEXT   = { red:'text-red-600', orange:'text-orange-500', purple:'text-purple-600', blue:'text-blue-700' }
          return (
            <div key={tile.key}
              onClick={() => setFilter(active ? 'all' : tile.key)}
              className={`card p-4 cursor-pointer transition-all border-2 ${active ? BORDER[tile.color]+' '+BG[tile.color]+' shadow-md' : 'border-transparent hover:border-gray-200'}`}
            >
              <div className={`text-2xl font-bold ${TEXT[tile.color]}`}>{tile.value ?? '-'}</div>
              <div className="text-xs text-gray-500 mt-0.5">{tile.label}</div>
              {tile.sub && <div className="text-xs text-gray-400 mt-0.5">{tile.sub}</div>}
              {active && <div className="text-xs mt-1 font-semibold" style={{color:'#0891b2'}}>- click to clear</div>}
            </div>
          )
        })}
      </div>

      {/* Vendor dependency banner */}
      {s.vendor_pct > 40 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🚨</span>
            <div>
              <h3 className="font-semibold text-red-800">High Vendor Dependency Detected</h3>
              <p className="text-sm text-red-700 mt-1">
                {s.vendor_pct}% of contributors are external vendors [TECH NE].
                Knowledge concentration in vendor resources poses a business continuity risk.
                Consider knowledge transfer programs and internal documentation drives.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'critical', 'high', 'medium', 'low'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 text-xs rounded-full border capitalize transition-colors ${
              filter === f ? 'bg-navy-700 text-white border-navy-700' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}>
            {f === 'all' ? 'All Topics' : `${RISK_ICON[f]} ${f}`}
          </button>
        ))}
      </div>

      {/* Topics */}
      <div className="space-y-3">
        {topics.length === 0 && <p className="text-sm text-gray-400">No topics match this filter.</p>}
        {topics.map(topic => (
          <div key={topic.topic} className={`card border ${RISK_COLOR[topic.risk_level]}`}>
            {/* Header — always visible */}
            <div className="p-4 cursor-pointer" onClick={() => toggleExpand(topic.topic)}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 capitalize">{topic.topic}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${RISK_COLOR[topic.risk_level]}`}>
                      {RISK_ICON[topic.risk_level]} {topic.risk_level}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {topic.unique_people} contributor{topic.unique_people !== 1 ? 's' : ''} · {topic.total_docs} docs
                    · <span className="text-blue-500">{expanded[topic.topic] ? '▲ collapse' : '▼ expand'}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-purple-700">{topic.vendor_pct}% vendor</div>
                  <div className="text-xs text-green-700">{topic.internal_pct}% internal</div>
                </div>
              </div>

              {/* Vendor/internal bar */}
              <div className="w-full bg-green-100 rounded-full h-2 mb-3">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${topic.vendor_pct}%` }} />
              </div>

              {/* Contributors with Teams button */}
              <div className="flex flex-wrap gap-2">
                {topic.top_contributors.map(c => (
                  <div key={c.name} className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border ${
                    c.type === 'vendor'   ? 'bg-purple-50 border-purple-200 text-purple-800' :
                    c.type === 'internal' ? 'bg-blue-50 border-green-200 text-green-800' :
                                            'bg-gray-50 border-gray-200 text-gray-600'
                  }`}>
                    <span>{c.type === 'vendor' ? '🔵' : c.type === 'internal' ? '🟢' : '⚪'}</span>
                    <span className="font-medium">{c.name}</span>
                    <span className="text-gray-400 mr-1">{c.count}</span>
                    <TeamsButton name={c.name} domain={teamsDomain} />
                  </div>
                ))}
              </div>
            </div>

            {/* Expanded — source documents */}
            {expanded[topic.topic] && topic.top_docs?.length > 0 && (
              <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 rounded-b-lg">
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Source Documents</p>
                <div className="space-y-2">
                  {topic.top_docs.map((doc, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <SourceBadge type={doc.source_type} />
                      {doc.url ? (
                        <a href={doc.url} target="_blank" rel="noreferrer"
                          className="text-sm text-blue-600 hover:underline flex-1 truncate">
                          {doc.title}
                        </a>
                      ) : (
                        <span className="text-sm text-gray-600 flex-1 truncate">{doc.title}</span>
                      )}
                      {doc.updated_at && (
                        <span className="text-xs text-gray-400 shrink-0">
                          {doc.updated_at.slice(0, 10)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {expanded[topic.topic] && (!topic.top_docs || topic.top_docs.length === 0) && (
              <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 rounded-b-lg text-xs text-gray-400">
                No document links available for this topic.
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// -- People Tab ----------------------------------------------------------------
function PeopleTab({ teamsDomain }) {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState(null)
  const [profile, setProfile]   = useState(null)
  const [loading, setLoading]   = useState(false)


  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setProfile(null)
    try {
      const r = await searchPeople(query)
      setResults(r.data)
    } finally {
      setLoading(false)
    }
  }

  const handlePersonClick = async (name) => {
    setLoading(true)
    try {
      const r = await getPersonProfile(name)
      setProfile(r.data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by name e.g. Jadhav, Nishantchandra..."
          className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-teal-400"
        />
        <button type="submit" className="btn-primary text-sm px-4">Search</button>
      </form>

      {loading && <div className="flex justify-center py-8"><Spinner /></div>}

      {/* Person profile */}
      {profile && !loading && (
        <div className="card p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-gray-900">{profile.name}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                  profile.type === 'vendor'   ? 'bg-purple-50 border-purple-200 text-purple-700' :
                  profile.type === 'internal' ? 'bg-blue-50 border-green-200 text-green-700' :
                                                 'bg-gray-50 border-gray-200 text-gray-600'
                }`}>
                  {profile.type === 'vendor' ? '🔵 Vendor [TECH NE]' :
                   profile.type === 'internal' ? '🟢 Internal [TECH]' : '⚪ Unknown'}
                </span>
                <TeamsButton name={profile.name} domain={teamsDomain} />
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                {profile.total_docs} documents · Last active: {profile.last_active || 'unknown'}
              </p>
            </div>
            <button onClick={() => setProfile(null)} className="text-gray-400 hover:text-gray-600 text-sm">✕ Back</button>
          </div>

          {/* Roles */}
          {profile.roles?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {profile.roles.map(r => (
                <span key={r} className="text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2 py-1 rounded-full">{r}</span>
              ))}
            </div>
          )}

          {/* By source — static display only */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Contributions by Source</h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(profile.by_source || {}).map(([src, count]) => (
                <div
                  key={src}
                  className="flex items-center gap-1.5 text-sm bg-white border border-gray-200 px-3 py-1.5 rounded-lg"
                >
                  <SourceBadge type={src} />
                  <span className="font-semibold text-gray-700">{count} docs</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top topics — display only */}
          {profile.top_topics?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2" style={{color:T.textSec}}>Top Topics</h3>
              <div className="flex flex-wrap gap-2">
                {profile.top_topics.map(t => (
                  <span
                    key={t.topic}
                    className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ background: T.teal+'12', color: T.teal, border: `1px solid ${T.teal+'40'}` }}
                  >
                    {t.topic}
                    <span className="ml-1 opacity-70">({t.count})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recent docs */}
          {profile.recent_docs?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2" style={{color:T.textSec}}>Recent Contributions</h3>
              <div className="space-y-2">
                {profile.recent_docs.map((doc, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                    <SourceBadge type={doc.source_type} />
                    {doc.url ? (
                      <a href={doc.url} target="_blank" rel="noreferrer"
                        className="text-sm text-blue-600 hover:underline flex-1 truncate">{doc.title}</a>
                    ) : (
                      <span className="text-sm text-gray-600 flex-1 truncate">{doc.title}</span>
                    )}
                    <span className="text-xs text-gray-400 shrink-0">{doc.updated_at}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search results */}
      {results && !profile && !loading && (
        <div>
          <p className="text-sm text-gray-500 mb-3">
            {results.total} contributor{results.total !== 1 ? 's' : ''} found for "{results.query}"
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            {results.results?.map(person => (
              <div key={person.name} className="card p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 text-sm">{person.name}</span>
                      {person.type === 'vendor' && (
                        <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded-full">🔵 Vendor</span>
                      )}
                      {person.type === 'internal' && (
                        <span className="text-xs bg-blue-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full">🟢 Internal</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">Last active: {person.last_active || 'unknown'}</p>
                  </div>
                  <span className="text-sm font-bold text-teal-600 shrink-0">{person.doc_count} docs</span>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {person.sources?.map(s => <SourceBadge key={s} type={s} />)}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePersonClick(person.name)}
                    className="flex-1 text-xs bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 transition-colors px-3 py-1.5 rounded-lg font-medium"
                  >
                    👤 View Profile
                  </button>
                  <TeamsButton name={person.name} domain={teamsDomain} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {results?.total === 0 && !loading && (
        <div className="text-center py-8 text-gray-400">No contributors found for "{results.query}"</div>
      )}
    </div>
  )
}

// -- Onboarding Tab ------------------------------------------------------------
function OnboardingTab() {
  const [topic, setTopic]     = useState('')
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)

  const load = async (t) => {
    if (!t || !t.trim()) return
    setLoading(true)
    try {
      const r = await getOnboardingPath(t)
      setData(r.data)
    } finally {
      setLoading(false)
    }
  }

  // Auto-submit if topic came from URL ?onboard=
  useEffect(() => {
    var params = new URLSearchParams(window.location.search)
    var pre = params.get('onboard') || ''
    if (pre) {
      setTopic(pre)
      load(pre)
    }
  }, [])

  const handleSearch = async (e) => {
    e.preventDefault()
    await load(topic)
  }

  const SECTION_BG = {
    confluence: 'bg-purple-50 border-purple-200',
    sharepoint: 'bg-blue-50 border-blue-200',
    github:     'bg-gray-50 border-gray-200',
    jira:       'bg-orange-50 border-orange-200',
  }

  return (
    <div className="space-y-4">
      <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 text-sm text-teal-800">
        <strong>🎓 Learning Path Generator</strong> — Enter any topic or system name.
        EKM builds a structured reading path: Confluence docs first, then process docs, then code reference.
        Jira tickets are shown last as reference only — not primary learning material.
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="e.g. payments pipeline, BIC ETL, CGME dashboard..."
          className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-teal-400"
        />
        <button type="submit" className="btn-primary text-sm px-4">Generate Path</button>
        <a href="/learn" target="_blank"
          className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg transition-all"
          style={{
            background: 'transparent',
            color: T.teal,
            border: `1px solid ${T.teal}40`,
            textDecoration: 'none',
          }}
          title="Open standalone multi-topic builder">
          ✦ Multi-topic
        </a>
        {data?.total > 0 && (
          <button type="button"
            onClick={() => { const url = `${window.location.origin}/learn?topics=${encodeURIComponent(topic)}`; navigator.clipboard.writeText(url).then(()=>alert('✓ Link copied! Share with new joiners — they can add more topics too.')).catch(()=>{ prompt('Copy this link:', url) }) }}
            className="text-sm bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 px-3 rounded-lg transition-colors"
            title="Open full learning path builder">
            🔗 Open Full Builder
          </button>
        )}
      </form>

      {loading && <div className="flex justify-center py-8"><Spinner /></div>}

      {data && !loading && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Learning path for <strong>"{data.topic}"</strong> — {data.total} documents across {data.sections?.length} source{data.sections?.length !== 1 ? 's' : ''}
          </p>

          {data.sections?.length === 0 && (
            <div className="text-center py-8 text-gray-400">No documents found for this topic.</div>
          )}

          {data.sections?.map(section => (
            <div key={section.source_type} className={`rounded-lg border p-4 ${SECTION_BG[section.source_type] || 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="font-semibold text-gray-800">{section.label}</span>
                <span className="text-xs text-gray-500">{section.docs.length} doc{section.docs.length !== 1 ? 's' : ''}</span>
                {section.is_reference && (
                  <span className="text-xs bg-orange-100 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full ml-auto">
                    Reference only — not primary reading
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {section.docs.map((doc, i) => (
                  <div key={i} className="flex items-start gap-3 bg-white rounded-lg p-3 shadow-sm">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-100 text-teal-700 font-bold text-xs shrink-0 mt-0.5">
                      {doc.read_order}
                    </div>
                    <div className="flex-1 min-w-0">
                      {doc.url ? (
                        <a href={doc.url} target="_blank" rel="noreferrer"
                          className="text-sm font-medium text-blue-600 hover:underline line-clamp-1">{doc.title}</a>
                      ) : (
                        <span className="text-sm font-medium text-gray-700 line-clamp-1">{doc.title}</span>
                      )}
                      <div className="flex items-center gap-2 mt-0.5">
                        {doc.author && <span className="text-xs text-gray-400">by {doc.author}</span>}
                        {doc.days_old && (
                          <span className={`text-xs ${doc.stale ? 'text-red-400' : 'text-gray-400'}`}>
                            {doc.stale ? '⚠️ ' : ''}{doc.days_old}d ago
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// -- Knowledge Gaps Tab --------------------------------------------------------
function GapsTab() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [gapFilter, setGapFilter] = useState(null)

  useEffect(() => {
    getKnowledgeGaps().then(r => { setData(r.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>
  if (!data)   return <div className="text-gray-500 text-sm">Could not load gaps report.</div>

  const SEV_COLOR = {
    critical: 'text-red-600 bg-red-50 border-red-200',
    high:     'text-orange-600 bg-orange-50 border-orange-200',
    medium:   'text-yellow-600 bg-yellow-50 border-yellow-200',
  }
  const SEV_ICON = { critical: '🔴', high: '🟠', medium: '🟡' }

  return (
    <div className="space-y-5">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        <strong>🕳️ Knowledge Gaps</strong> — Systems and projects that have active Jira tickets or GitHub activity
        but <strong>zero documentation</strong> in Confluence or SharePoint. These are your blind spots.
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { key: null,       label: 'Total Gaps',    value: data.total_gaps,    color: 'yellow' },
          { key: 'critical', label: 'Critical Gaps', value: data.critical_gaps, color: 'red' },
          { key: 'high',     label: 'High Priority', value: data.high_gaps,     color: 'orange' },
        ].map(tile => {
          const active = gapFilter === tile.key
          const BORDER = { yellow:'border-yellow-400', red:'border-red-400', orange:'border-orange-400' }
          const BG     = { yellow:'bg-yellow-50', red:'bg-red-50', orange:'bg-orange-50' }
          const TEXT   = { yellow:'text-yellow-600', red:'text-red-600', orange:'text-orange-500' }
          return (
            <div key={String(tile.key)}
              onClick={() => setGapFilter(active ? null : tile.key)}
              className={`card p-4 cursor-pointer transition-all border-2 ${active ? BORDER[tile.color]+' '+BG[tile.color]+' shadow-md' : 'border-transparent hover:border-gray-200'}`}
            >
              <div className={`text-2xl font-bold ${TEXT[tile.color]}`}>{tile.value ?? '-'}</div>
              <div className="text-xs text-gray-500 mt-0.5">{tile.label}</div>
              {active && tile.key && <div className="text-xs mt-1 font-semibold" style={{color:'#0891b2'}}>- click to clear</div>}
            </div>
          )
        })}
      </div>

      {data.gaps?.length === 0 ? (
        <div className="text-center py-10 text-blue-700">
          ✅ No knowledge gaps detected — all active systems have documentation!
        </div>
      ) : (
        <>
          {gapFilter && (
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            Showing <span className="font-semibold capitalize" style={{color:'#0891b2'}}>{gapFilter}</span> gaps
            <button onClick={() => setGapFilter(null)} className="text-xs underline text-gray-400">clear</button>
          </div>
        )}
        <div className="space-y-3">
          {(gapFilter ? data.gaps.filter(g => g.severity === gapFilter) : data.gaps).map((gap, i) => (
            <div key={i} className={`card p-4 border ${SEV_COLOR[gap.severity]}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 capitalize">{gap.topic}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${SEV_COLOR[gap.severity]}`}>
                    {SEV_ICON[gap.severity]} {gap.severity}
                  </span>
                </div>
                <div className="text-xs text-gray-500 shrink-0">
                  {gap.jira_tickets > 0 && <span className="mr-2">🎫 {gap.jira_tickets} tickets</span>}
                  {gap.github_refs > 0  && <span>💻 {gap.github_refs} GitHub refs</span>}
                </div>
              </div>
              <p className="text-xs text-gray-600 mb-2">{gap.recommendation}</p>
              {gap.sample_docs?.length > 0 && (
                <div className="space-y-1">
                  {gap.sample_docs.map((doc, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <SourceBadge type={doc.source_type} />
                      {doc.url ? (
                        <a href={doc.url} target="_blank" rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline truncate">{doc.title}</a>
                      ) : (
                        <span className="text-xs text-gray-500 truncate">{doc.title}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        </>
      )}
    </div>
  )
}

// -- Experts At Risk Tab -------------------------------------------------------
function ExpertsAtRiskTab({ teamsDomain }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [riskFilter, setRiskFilter] = useState(null)

  useEffect(() => {
    getExpertsAtRisk().then(r => { setData(r.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>
  if (!data)   return <div className="text-gray-500 text-sm">Could not load experts report.</div>

  const RISK_COLOR = {
    critical: 'border-red-200 bg-red-50',
    high:     'border-orange-200 bg-orange-50',
    medium:   'border-yellow-200 bg-yellow-50',
  }
  const RISK_ICON = { critical: '🔴', high: '🟠', medium: '🟡' }

  return (
    <div className="space-y-5">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
        <strong>⚠️ Expert Knowledge At Risk</strong> — Contributors who haven't been active in 90+ days,
        or external vendors whose knowledge leaves when their contract ends.
        Act before the knowledge is gone.
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { key: null,       label: 'At Risk Experts', value: data.total_at_risk,  color: 'orange' },
          { key: 'critical', label: 'Critical',         value: data.critical_count, color: 'red' },
          { key: 'high',     label: 'High Risk',        value: data.high_count,     color: 'amber' },
        ].map(tile => {
          const active = riskFilter === tile.key
          const BORDER = { orange:'border-orange-400', red:'border-red-400', amber:'border-amber-400' }
          const BG     = { orange:'bg-orange-50', red:'bg-red-50', amber:'bg-amber-50' }
          const TEXT   = { orange:'text-orange-600', red:'text-red-600', amber:'text-amber-600' }
          return (
            <div key={String(tile.key)}
              onClick={() => setRiskFilter(active ? null : tile.key)}
              className={`card p-4 cursor-pointer transition-all border-2 ${active ? BORDER[tile.color]+' '+BG[tile.color]+' shadow-md' : 'border-transparent hover:border-gray-200'}`}
            >
              <div className={`text-2xl font-bold ${TEXT[tile.color]}`}>{tile.value ?? '-'}</div>
              <div className="text-xs text-gray-500 mt-0.5">{tile.label}</div>
              {active && tile.key && <div className="text-xs mt-1 font-semibold" style={{color:'#0891b2'}}>- click to clear</div>}
            </div>
          )
        })}
      </div>

      {data.experts?.length === 0 ? (
        <div className="text-center py-10 text-blue-700">
          ✅ No at-risk experts detected.
        </div>
      ) : (
        <>
          {riskFilter && (
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            Showing <span className="font-semibold capitalize" style={{color:'#0891b2'}}>{riskFilter}</span> experts
            <button onClick={() => setRiskFilter(null)} className="text-xs underline text-gray-400">clear</button>
          </div>
        )}
        <div className="space-y-3">
          {(riskFilter ? data.experts.filter(e => e.risk_level === riskFilter) : data.experts).map((expert, i) => (
            <div key={i} className={`card p-4 border ${RISK_COLOR[expert.risk_level]}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{expert.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      expert.type === 'vendor' ? 'bg-purple-50 border-purple-200 text-purple-700' :
                      'bg-blue-50 border-green-200 text-green-700'
                    }`}>
                      {expert.type === 'vendor' ? '🔵 Vendor' : '🟢 Internal'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${
                      expert.risk_level === 'critical' ? 'bg-red-50 border-red-200 text-red-600' :
                      expert.risk_level === 'high'     ? 'bg-orange-50 border-orange-200 text-orange-600' :
                                                          'bg-yellow-50 border-yellow-200 text-yellow-600'
                    }`}>
                      {RISK_ICON[expert.risk_level]} {expert.risk_level}
                    </span>
                    <TeamsButton name={expert.name} domain={teamsDomain} />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {expert.doc_count} docs · {expert.topic_count} topics ·
                    Last active: {expert.last_active || 'unknown'}
                    {expert.days_inactive < 999 && ` (${expert.days_inactive}d ago)`}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-700 mb-2 font-medium">{expert.recommendation}</p>
              {expert.risk_factors?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {expert.risk_factors.map(f => (
                    <span key={f} className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{f}</span>
                  ))}
                </div>
              )}
              {expert.top_topics?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {expert.top_topics.map(t => (
                    <span key={t} className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        </>
      )}
    </div>
  )
}

// -- Coverage Tab --------------------------------------------------------------
function CoverageTab() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    getCoverageReport().then(r => { setData(r.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>
  if (!data)   return <div className="text-gray-500 text-sm">Could not load coverage report.</div>

  const GRADE_COLOR = {
    A: 'text-green-700 bg-blue-50 border-green-200',
    B: 'text-teal-700 bg-teal-50 border-teal-200',
    C: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    D: 'text-orange-700 bg-orange-50 border-orange-200',
    F: 'text-red-700 bg-red-50 border-red-200',
  }
  const SCORE_BAR = (score) =>
    score >= 80 ? 'bg-blue-600' :
    score >= 60 ? 'bg-teal-500'  :
    score >= 40 ? 'bg-yellow-500' :
    score >= 20 ? 'bg-orange-500' : 'bg-red-500'

  const filtered = filter === 'all'
    ? data.coverage
    : data.coverage?.filter(c => c.grade === filter)

  return (
    <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <strong>📊 Documentation Coverage Score</strong> — How well documented is each system?
        Scored 0–100: Confluence (40pts) + SharePoint (30pts) + GitHub files (20pts) + Jira (10pts).
        Worst scores shown first.
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="Average Score" value={`${data.average_score}/100`}
          color={data.average_score >= 60 ? 'text-blue-700' : data.average_score >= 40 ? 'text-yellow-600' : 'text-red-600'} />
        <StatCard label="Total Topics"  value={data.total_topics} color="text-gray-700" />
        <div className="card p-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Grade Distribution</div>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(data.grade_distribution || {}).map(([grade, count]) => (
              <span key={grade} className={`text-xs font-bold px-2 py-1 rounded border ${GRADE_COLOR[grade]}`}>
                {grade}: {count}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Grade filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'F', 'D', 'C', 'B', 'A'].map(g => (
          <button key={g} onClick={() => setFilter(g)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              filter === g ? 'bg-navy-700 text-white border-navy-700' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}>
            {g === 'all' ? 'All' : `Grade ${g}`}
          </button>
        ))}
      </div>

      {/* Coverage list */}
      <div className="space-y-2">
        {filtered?.map((item, i) => (
          <div key={i} className="card p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-sm font-bold px-2.5 py-1 rounded border ${GRADE_COLOR[item.grade]}`}>
                {item.grade}
              </span>
              <span className="font-medium text-gray-900 capitalize flex-1">{item.topic}</span>
              <span className="text-sm font-bold text-gray-700">{item.score}/100</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
              <div className={`h-2 rounded-full ${SCORE_BAR(item.score)}`} style={{ width: `${item.score}%` }} />
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              {Object.entries(item.by_source).map(([src, count]) => (
                <span key={src} className="flex items-center gap-1">
                  <SourceBadge type={src} />
                  {count} doc{count !== 1 ? 's' : ''}
                </span>
              ))}
              {item.missing_sources?.length > 0 && (
                <span className="text-red-400 ml-auto">
                  Missing: {item.missing_sources.join(', ')}
                </span>
              )}
            </div>
            {item.recommendation && (
              <p className="text-xs text-orange-600 mt-1.5">💡 {item.recommendation}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// -- Knowledge Velocity Tab ---------------------------------------------------
function VelocityTab() {
  const [input, setInput]     = useState('')
  const [topic, setTopic]     = useState('')
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const load = async (t) => {
    setLoading(true)
    setError(null)
    try {
      const r = await getVelocity(t || undefined)
      setData(r.data)
    } catch(e) {
      setError('Failed to load velocity data.')
    } finally { setLoading(false) }
  }

  useEffect(() => { load('') }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    setTopic(input)
    load(input)
  }

  const maxVal = Math.max(...(data?.series?.map(s =>
    s.confluence + s.jira + s.github + s.sharepoint) || [1]), 1)

  const COLORS = { confluence: '#8b5cf6', jira: '#f97316', github: '#6b7280', sharepoint: '#3b82f6' }
  const TREND_COLOR = data?.trend === 'up' ? 'text-blue-700' : data?.trend === 'down' ? 'text-red-500' : 'text-gray-500'
  const TREND_ICON  = data?.trend === 'up' ? '📈' : data?.trend === 'down' ? '📉' : '➡️'

  return (
    <div className="space-y-5">
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-sm text-indigo-800">
        <strong>📈 Knowledge Velocity</strong> — See how knowledge activity trends over time.
        Trending up = healthy, growing system. Trending down = knowledge going stale or team moving on.
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          placeholder="Filter by topic (leave blank for org-wide)..."
          className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-teal-400" />
        <button type="submit" className="btn-primary text-sm px-4">View</button>
        {topic && <button type="button" onClick={() => { setInput(''); setTopic(''); load('') }}
          className="text-xs text-gray-400 hover:text-gray-600 px-2">Clear</button>}
      </form>

      {loading && <div className="flex justify-center py-8"><Spinner /></div>}

      {error && (
        <div className="text-center py-8 text-red-500 text-sm">{error}</div>
      )}

      {data && !loading && !data.has_data && (
        <div className="card p-6 text-center space-y-3">
          <div className="text-3xl">📭</div>
          <div className="text-base font-semibold text-gray-700">No activity data found</div>
          <div className="text-sm text-gray-500 max-w-md mx-auto">
            EKM found <strong>{data.total_docs}</strong> documents but could not read dates from <strong>{data.parsed_count}</strong> of them.
            This usually means documents haven't been synced yet, or dates are stored in an unexpected format.
          </div>
          <div className="text-xs text-gray-400 bg-gray-50 rounded p-3 text-left font-mono">
            total_docs: {data.total_docs} &nbsp;·&nbsp; parsed_dates: {data.parsed_count}
            <br/>
            <span className="text-teal-600">-> Try running a full sync first: Dashboard → Sync All (Force Full)</span>
          </div>
          <a href="/api/intelligence/velocity/debug" target="_blank"
            className="text-xs text-teal-600 underline hover:text-teal-700 block">
            Open velocity debug (shows raw date formats in DB) ->
          </a>
        </div>
      )}

      {data && !loading && data.has_data && (
        <div className="space-y-4">
          {/* Trend summary */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Trend" value={`${TREND_ICON} ${data.trend}`} color={TREND_COLOR} />
            <StatCard label="Last 3 months" value={data.recent_3m} color="text-teal-600"
              sub={`of ${data.total} total docs`} />
            <StatCard label="vs Prior 3 months"
              value={`${data.trend_pct > 0 ? '+' : ''}${data.trend_pct}%`}
              color={TREND_COLOR} />
          </div>

          {/* Bar chart */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">
                Monthly Activity — {topic || 'All Topics'}
              </h3>
              <span className="text-xs text-gray-400">
                {data.total.toLocaleString()} docs · {data.series?.length} months
              </span>
            </div>
            <div className="flex items-end gap-1 h-32">
              {data.series?.map((s, i) => {
                const total = s.confluence + s.jira + s.github + s.sharepoint
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                    <div className="w-full flex flex-col-reverse" style={{ height: '112px' }}>
                      {['confluence','jira','github','sharepoint'].map(src => {
                        const h = total ? Math.round((s[src] / maxVal) * 112) : 0
                        return h > 0 ? (
                          <div key={src} style={{ height: `${h}px`, backgroundColor: COLORS[src] }}
                            className="w-full first:rounded-b last:rounded-t" />
                        ) : null
                      })}
                    </div>
                    <span className="text-gray-400 rotate-45 origin-left mt-1 whitespace-nowrap"
                      style={{ fontSize: '9px' }}>{s.label.split(' ')[0]}</span>
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10 pointer-events-none">
                      <div className="font-semibold mb-0.5">{s.label}: {total}</div>
                      {['confluence','jira','github','sharepoint'].map(src => s[src] > 0 && (
                        <div key={src}>{src}: {s[src]}</div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Legend */}
            <div className="flex gap-4 mt-3 flex-wrap">
              {Object.entries(COLORS).map(([src, color]) => (
                <div key={src} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                  {src}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// -- Handover Tracker Tab ------------------------------------------------------
function HandoverTab({ teamsDomain }) {
  const [name, setName]       = useState('')
  const [input, setInput]     = useState('')
  const [data, setData]       = useState(null)
  const [progress, setProgress] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving]   = useState(false)

  const load = async (n) => {
    setLoading(true)
    try {
      const [pack, prog] = await Promise.all([
        getHandover(n),
        getHandoverProgress(n),
      ])
      setData(pack.data)
      setProgress(prog.data?.progress || {})
    } finally { setLoading(false) }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (!input.trim()) return
    setName(input)
    load(input)
  }

  const toggleItem = async (sectionId, idx) => {
    const key = `${sectionId}-${idx}`
    const newProgress = { ...progress, [key]: !progress[key] }
    setProgress(newProgress)
    setSaving(true)
    try { await saveHandoverProgress(name, newProgress) }
    finally { setSaving(false) }
  }

  const totalItems  = data?.sections?.reduce((s, sec) => s + sec.items.length, 0) || 0
  const doneItems   = Object.values(progress).filter(Boolean).length
  const donePct     = totalItems ? Math.round(doneItems / totalItems * 100) : 0

  const SECTION_ICON = {
    documentation: '📖', open_tickets: '🎫', code: '💻', process_docs: '📋'
  }

  return (
    <div className="space-y-4">
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-orange-800">
        <strong>📦 Handover Tracker</strong> — Search for a person to generate their full handover pack.
        Tick items off as knowledge is transferred. Progress is saved automatically.
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          placeholder="Enter contributor name e.g. Jadhav, Nishantchandra [TECH]..."
          className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-teal-400" />
        <button type="submit" className="btn-primary text-sm px-4">Generate Pack</button>
      </form>

      {loading && <div className="flex justify-center py-8"><Spinner /></div>}

      {data && !loading && (
        <div className="space-y-4">
          {/* Header */}
          <div className="card p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-gray-900">{data.name}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                    data.type === 'vendor' ? 'bg-purple-50 border-purple-200 text-purple-700' :
                    'bg-blue-50 border-green-200 text-green-700'
                  }`}>
                    {data.type === 'vendor' ? '🔵 Vendor [TECH NE]' : '🟢 Internal [TECH]'}
                  </span>
                  <TeamsButton name={data.name} domain={teamsDomain} />
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {data.total_docs} docs · {data.open_tickets} open tickets
                  {saving && <span className="ml-2 text-teal-500">Saving…</span>}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-teal-600">{donePct}%</div>
                <div className="text-xs text-gray-400">{doneItems}/{totalItems} done</div>
              </div>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-teal-500 h-2 rounded-full transition-all"
                style={{ width: `${donePct}%` }} />
            </div>
            {/* Topics */}
            {data.top_topics?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {data.top_topics.map(t => (
                  <span key={t} className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
            )}
          </div>

          {/* Sections */}
          {data.sections?.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">No documents found for this person.</p>
          )}
          {data.sections?.map(section => (
            <div key={section.id} className="card overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                <span>{SECTION_ICON[section.id] || '📄'}</span>
                <span className="font-semibold text-gray-800 text-sm">{section.title}</span>
                <span className="text-xs text-gray-400 ml-1">
                  {section.items.filter((_,i) => progress[`${section.id}-${i}`]).length}/{section.items.length} done
                </span>
              </div>
              <p className="px-4 py-2 text-xs text-gray-500 border-b border-gray-50">{section.desc}</p>
              <div className="divide-y divide-gray-50">
                {section.items.map((item, i) => {
                  const key  = `${section.id}-${i}`
                  const done = !!progress[key]
                  return (
                    <div key={i} className={`flex items-start gap-3 px-4 py-3 transition-colors ${done ? 'bg-gray-50' : 'hover:bg-gray-50'}`}>
                      <button onClick={() => toggleItem(section.id, i)}
                        className="shrink-0 mt-0.5 text-gray-300 hover:text-teal-500 transition-colors">
                        {done
                          ? <span className="text-teal-500 text-lg">✓</span>
                          : <span className="text-gray-300 text-lg">○</span>}
                      </button>
                      <div className="flex-1 min-w-0">
                        {item.doc.url ? (
                          <a href={item.doc.url} target="_blank" rel="noreferrer"
                            className={`text-sm hover:underline ${done ? 'line-through text-gray-400' : 'text-blue-600'}`}>
                            {item.doc.title}
                          </a>
                        ) : (
                          <span className={`text-sm ${done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                            {item.doc.title}
                          </span>
                        )}
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {item.doc.status && (
                            <span className="text-xs bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded">
                              {item.doc.status}
                            </span>
                          )}
                          {item.doc.priority && (
                            <span className="text-xs text-gray-400">{item.doc.priority}</span>
                          )}
                          {item.doc.tags?.map(t => (
                            <span key={t} className="text-xs text-gray-400">{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {donePct === 100 && (
            <div className="bg-blue-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="text-3xl mb-1">🎉</div>
              <p className="font-semibold text-green-800">Handover complete!</p>
              <p className="text-sm text-green-700 mt-1">All items for {data.name} have been transferred.</p>
            </div>
          )}
        </div>
      )}

      {data?.total_docs === 0 && !loading && (
        <div className="text-center py-8 text-gray-400">No documents found for "{name}".</div>
      )}
    </div>
  )
}


// -- Main Intelligence Page -- Sidebar Layout ----------------------------------

const NAV_GROUPS = [
  {
    group: 'Search Intelligence',
    items: [
      { id: 'analytics',  icon: '📊', label: 'Analytics',       sub: 'Queries, trends, gaps'        },
      { id: 'velocity',   icon: '📈', label: 'Velocity',         sub: '12-month activity chart'      },
    ]
  },
  {
    group: 'Risk & Governance',
    items: [
      { id: 'risk',       icon: '🔴', label: 'Risk & Vendors',   sub: 'Dependency alerts'            },
      { id: 'gaps',       icon: '🕳️',  label: 'Knowledge Gaps',   sub: 'Undocumented systems'         },
      { id: 'experts',    icon: '⚠️',  label: 'Experts At Risk',  sub: 'Inactive & vendor SMEs'       },
    ]
  },
  {
    group: 'Quality',
    items: [
      { id: 'health',     icon: '❤️',  label: 'Health',           sub: 'Freshness & audits'           },
      { id: 'coverage',   icon: '📋', label: 'Coverage Score',   sub: 'Grade A–F per system'         },
    ]
  },
  {
    group: 'People & Enablement',
    items: [
      { id: 'handover',   icon: '📦', label: 'Handover Tracker', sub: 'Knowledge transfer packs'     },
      { id: 'people',     icon: '👤', label: 'People',           sub: 'Contributor profiles'         },
      { id: 'onboarding', icon: '🎓', label: 'Learning Path',    sub: 'Shareable onboarding paths'   },
    ]
  },
]

// Page titles/descriptions for the content header
const TAB_META = {
  analytics:  { title: 'Search Analytics',       desc: 'Query volume, top searches, and zero-result knowledge gaps' },
  velocity:   { title: 'Knowledge Velocity',      desc: '12-month activity trend across all indexed sources' },
  risk:       { title: 'Risk & Vendor Intelligence', desc: 'Vendor dependency alerts and knowledge concentration risk' },
  gaps:       { title: 'Knowledge Gaps',          desc: 'Active systems with no corresponding documentation' },
  experts:    { title: 'Experts At Risk',         desc: 'SMEs inactive 90d+ or held entirely by external vendors' },
  health:     { title: 'Knowledge Health',        desc: 'Content freshness, Jira↔Confluence audit, and stale docs' },
  coverage:   { title: 'Coverage Score',          desc: 'Documentation completeness graded A–F per system' },
  handover:   { title: 'Handover Tracker',        desc: 'Structured knowledge transfer checklist with saved progress' },
  people:     { title: 'People',                  desc: 'Contributor profiles, topic ownership, and team classification' },
  onboarding: { title: 'Learning Path',           desc: 'Curated reading path for any system — shareable URL' },
}

export default function Intelligence() {
  const location = useLocation()
  const _initTab = () => {
    try {
      const p = new URLSearchParams(window.location.search)
      if (p.get('onboard')) return 'onboarding'
    } catch(e) {}
    return location.state?.tab || 'analytics'
  }
  const [tab, setTab]                 = useState(_initTab)
  const [teamsDomain, setTeamsDomain] = useState('citi.com')

  // Update tab from router state OR ?onboard= query param
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search)
      if (p.get('onboard')) { setTab('onboarding'); return }
    } catch(e) {}
    if (location.state?.tab) setTab(location.state.tab)
  }, [location.search, location.state?.tab])

  useEffect(() => {
    getConfig().then(r => { if (r.data?.teams_domain) setTeamsDomain(r.data.teams_domain) })
      .catch(() => {})
  }, [])

  const meta = TAB_META[tab] || {}

  return (
    <div className="flex gap-0 h-full min-h-screen" style={{height:'calc(100vh - 0px)'}}>
      {/* ── Sidebar ── */}
      <aside className="w-56 shrink-0 flex flex-col pt-5 pb-8 overflow-y-auto" style={{background:T.navBg,borderRight:`1px solid ${T.navBorder}`}}>
        <div className="px-4 mb-5">
          <p className="text-xs font-bold uppercase tracking-widest" style={{color:T.navText,fontFamily:T.mono}}>Intelligence</p>
        </div>

        {NAV_GROUPS.map(group => (
          <div key={group.group} className="mb-5">
            <p className="px-4 text-xs font-semibold uppercase tracking-wider mb-1" style={{color:T.navText,fontFamily:T.mono,opacity:0.7}}>
              {group.group}
            </p>
            {group.items.map(item => {
              const active = tab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  style={active ? {background:T.navActiveBg,borderLeft:`3px solid ${T.navActive}`,paddingLeft:'13px',color:T.navActive} : {borderLeft:'3px solid transparent',color:T.navText}}
                  className={`w-full text-left px-4 py-2.5 flex items-start gap-2.5 transition-colors ${
                    active ? 'font-semibold' : 'hover:opacity-80'
                  }`}
                >
                  <span className="text-base leading-none mt-0.5">{item.icon}</span>
                  <span>
                    <span className="block text-sm font-medium leading-tight">{item.label}</span>
                    <span className={`block text-xs leading-tight mt-0.5`}>
                      {item.sub}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        ))}
      </aside>

      {/* ── Content area ── */}
      <main className="flex-1 overflow-y-auto p-6" style={{background:T.bg}}>
        {/* Content header */}
        <div className="mb-5 pb-4" style={{borderBottom:`1px solid ${T.border}`}}>
          <h1 className="text-xl font-bold" style={{color:T.textPri,fontFamily:T.font}}>{meta.title}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{meta.desc}</p>
        </div>

        {/* Tab content */}
        {tab === 'analytics'  && <AnalyticsTab />}
        {tab === 'velocity'   && <VelocityTab />}
        {tab === 'risk'       && <RiskTab teamsDomain={teamsDomain} />}
        {tab === 'health'     && <HealthTab />}
        {tab === 'gaps'       && <GapsTab />}
        {tab === 'experts'    && <ExpertsAtRiskTab teamsDomain={teamsDomain} />}
        {tab === 'coverage'   && <CoverageTab />}
        {tab === 'handover'   && <HandoverTab teamsDomain={teamsDomain} />}
        {tab === 'people'     && <PeopleTab teamsDomain={teamsDomain} />}
        {tab === 'onboarding' && <OnboardingTab />}
      </main>
    </div>
  )
}
