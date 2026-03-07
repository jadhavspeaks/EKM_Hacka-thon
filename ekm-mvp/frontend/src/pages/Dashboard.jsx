import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboard, triggerSync, getAnalyticsStats } from '../api'
import { SourceBadge, StatusBadge, Spinner } from '../components/UI'
import {
  RefreshCw, Database, Search, TrendingUp, AlertTriangle,
  Clock, CheckCircle, Activity, Users, FileText, Zap
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

// ── Colour tokens ─────────────────────────────────────────────────────────────
const SRC_CFG = {
  confluence: { label: 'Confluence', dot: 'bg-purple-500', ring: 'border-purple-200', bg: 'bg-purple-50',  text: 'text-purple-700' },
  jira:       { label: 'Jira',       dot: 'bg-orange-500', ring: 'border-orange-200', bg: 'bg-orange-50',  text: 'text-orange-700' },
  github:     { label: 'GitHub',     dot: 'bg-gray-700',   ring: 'border-gray-200',   bg: 'bg-gray-50',    text: 'text-gray-700'   },
  sharepoint: { label: 'SharePoint', dot: 'bg-blue-500',   ring: 'border-blue-200',   bg: 'bg-blue-50',    text: 'text-blue-700'   },
}

// ── Mini sparkline (SVG) ──────────────────────────────────────────────────────
function Sparkline({ values = [], color = '#0d9488' }) {
  if (!values.length) return null
  const max = Math.max(...values, 1)
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 80
    const y = 28 - (v / max) * 26
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width="80" height="28" viewBox="0 0 80 28" className="opacity-60">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, trend, trendVal, iconColor = 'text-teal-600', iconBg = 'bg-teal-50', onClick }) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 ${onClick ? 'cursor-pointer hover:border-teal-300 transition-colors' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon size={20} className={iconColor} />
        </div>
        {trendVal !== undefined && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            trendVal > 0 ? 'bg-green-50 text-green-700' : trendVal < 0 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'
          }`}>
            {trendVal > 0 ? '↑' : trendVal < 0 ? '↓' : '→'} {Math.abs(trendVal)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        <p className="text-xs font-medium text-gray-500 mt-0.5">{label}</p>
      </div>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

// ── Source card (active sources only) ────────────────────────────────────────
function SourceCard({ src, syncing, onSync }) {
  const cfg = SRC_CFG[src.source_type] || SRC_CFG.confluence
  const isSyncing = syncing === src.source_type
  const isError = src.sync_status === 'error' || src.sync_status === 'failed'
  const isOk    = src.sync_status === 'success' || src.sync_status === 'idle'

  return (
    <div className={`bg-white rounded-xl border ${cfg.ring} shadow-sm p-4 flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
          <span className="text-sm font-semibold text-gray-800">{cfg.label}</span>
        </div>
        <span className={`w-2 h-2 rounded-full ${isError ? 'bg-red-400' : isOk ? 'bg-green-400 animate-pulse' : 'bg-gray-300'}`} />
      </div>

      <div>
        <p className="text-3xl font-bold text-gray-900">{src.doc_count?.toLocaleString() ?? '—'}</p>
        <p className="text-xs text-gray-400 mt-0.5">documents indexed</p>
      </div>

      {src.last_sync && (
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <Clock size={11} />
          {format(new Date(src.last_sync), 'MMM d, HH:mm')}
        </p>
      )}

      {isError && src.error_message && (
        <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1 line-clamp-2">{src.error_message}</p>
      )}

      <button
        className={`w-full text-xs font-medium py-1.5 rounded-lg border transition-colors flex items-center justify-center gap-1.5 ${
          isSyncing ? 'bg-gray-50 text-gray-400' : `${cfg.bg} ${cfg.text} border-current`
        }`}
        onClick={() => onSync(src.source_type)}
        disabled={!!syncing}
      >
        <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
        {isSyncing ? 'Syncing…' : 'Sync'}
      </button>
    </div>
  )
}

// ── Top query pill ─────────────────────────────────────────────────────────────
function QueryPill({ query, count, rank }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-700 text-xs font-bold flex items-center justify-center shrink-0">{rank}</span>
      <span className="text-sm text-gray-700 flex-1 truncate">{query}</span>
      <span className="text-xs text-gray-400 font-medium">{count}×</span>
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [data, setData]           = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [syncing, setSyncing]     = useState(null)
  const [forceFull, setForceFull] = useState(false)
  const navigate = useNavigate()

  const load = async () => {
    try {
      const [dash, stats] = await Promise.all([
        getDashboard(),
        getAnalyticsStats(30).catch(() => ({ data: null })),
      ])
      setData(dash.data)
      setAnalytics(stats.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleSync = async (sourceType) => {
    setSyncing(sourceType || 'all')
    try { await triggerSync(sourceType, forceFull); await load() }
    finally { setSyncing(null) }
  }

  if (loading) return <div className="flex justify-center items-center h-64"><Spinner /></div>

  // Filter out servicenow from sources entirely
  const activeSources = (data?.sources || []).filter(s => s.source_type !== 'servicenow')
  const total = activeSources.reduce((s, src) => s + (src.doc_count || 0), 0)
  const searches = analytics?.total_searches ?? 0
  const zeroResults = analytics?.zero_result_queries?.length ?? 0
  const topQueries  = analytics?.top_queries?.slice(0, 8) ?? []

  // Recent 7-day search trend from daily_searches
  const dailyVals = (analytics?.daily_searches || []).slice(-7).map(d => d.count || 0)

  // Health signal: any source with error?
  const hasError = activeSources.some(s => s.sync_status === 'error' || s.sync_status === 'failed')
  const lastSync = activeSources.reduce((latest, s) => {
    if (!s.last_sync) return latest
    return !latest || new Date(s.last_sync) > new Date(latest) ? s.last_sync : latest
  }, null)

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Hub</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Executive overview · {lastSync ? `Last updated ${formatDistanceToNow(new Date(lastSync), { addSuffix: true })}` : 'Never synced'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => setForceFull(f => !f)}
              className={`relative w-9 h-5 rounded-full transition-colors ${forceFull ? 'bg-orange-500' : 'bg-gray-200'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${forceFull ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className={`text-xs font-medium ${forceFull ? 'text-orange-600' : 'text-gray-400'}`}>
              {forceFull ? 'Force Full' : 'Incremental'}
            </span>
          </label>
          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => handleSync(null)}
            disabled={!!syncing}
          >
            <RefreshCw size={15} className={syncing === 'all' ? 'animate-spin' : ''} />
            {syncing === 'all' ? 'Syncing…' : 'Sync All'}
          </button>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon={Database}
          label="Total Documents"
          value={total.toLocaleString()}
          sub={`${activeSources.length} sources active`}
          iconColor="text-teal-600" iconBg="bg-teal-50"
        />
        <KpiCard
          icon={Search}
          label="Searches (30 days)"
          value={searches.toLocaleString()}
          sub={dailyVals.length > 1 ? 'trend →' : 'start searching to track'}
          iconColor="text-indigo-600" iconBg="bg-indigo-50"
          onClick={() => navigate('/intelligence')}
        />
        <KpiCard
          icon={AlertTriangle}
          label="Zero-Result Queries"
          value={zeroResults}
          sub="topics with no answers"
          iconColor="text-amber-600" iconBg="bg-amber-50"
          onClick={() => navigate('/intelligence')}
        />
        <KpiCard
          icon={hasError ? AlertTriangle : CheckCircle}
          label="Sync Health"
          value={hasError ? 'Issues' : 'Healthy'}
          sub={hasError ? 'Check source errors below' : 'All sources synced OK'}
          iconColor={hasError ? 'text-red-600' : 'text-green-600'}
          iconBg={hasError ? 'bg-red-50' : 'bg-green-50'}
        />
      </div>

      {/* ── Two columns: sources + analytics ── */}
      <div className="grid md:grid-cols-5 gap-5">

        {/* Sources (3 cols) */}
        <div className="md:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Active Sources</h2>
            {/* SharePoint future badge */}
            <span className="text-xs text-blue-500 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
              SharePoint — roadmap Q2
            </span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {activeSources
              .filter(s => s.source_type !== 'sharepoint')
              .map(src => (
                <SourceCard key={src.source_type} src={src} syncing={syncing} onSync={handleSync} />
              ))
            }
            {/* SharePoint — future */}
            <div className="bg-white rounded-xl border border-dashed border-blue-200 p-4 flex flex-col gap-3 opacity-60">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                <span className="text-sm font-semibold text-gray-500">SharePoint</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-300">—</p>
                <p className="text-xs text-gray-400 mt-0.5">Azure AD setup required</p>
              </div>
              <span className="text-xs text-blue-500 font-medium">IT action · Q2 roadmap</span>
            </div>
          </div>
        </div>

        {/* Analytics (2 cols) */}
        <div className="md:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Search Analytics</h2>

          {/* Sparkline card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs text-gray-400 font-medium">7-day search volume</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">
                  {dailyVals.reduce((a,b) => a+b, 0)} queries
                </p>
              </div>
              <Sparkline values={dailyVals} color="#0d9488" />
            </div>
            {analytics?.daily_searches?.slice(-7).map((d, i) => (
              <div key={i} className="flex items-center gap-2 py-0.5">
                <span className="text-xs text-gray-400 w-14 shrink-0">{format(new Date(d.date), 'EEE d')}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-teal-400 h-1.5 rounded-full"
                    style={{ width: `${Math.min((d.count / Math.max(...dailyVals, 1)) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-5 text-right">{d.count}</span>
              </div>
            ))}
            {(!analytics?.daily_searches?.length) && (
              <p className="text-xs text-gray-400 text-center py-3">No searches yet — data appears as team uses EKM</p>
            )}
          </div>

          {/* Top queries */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400 font-medium">Top search queries</p>
              <button onClick={() => navigate('/intelligence')} className="text-xs text-teal-600 hover:underline">
                View all →
              </button>
            </div>
            {topQueries.length > 0
              ? topQueries.map((q, i) => <QueryPill key={i} query={q.query} count={q.count} rank={i+1} />)
              : <p className="text-xs text-gray-400 py-3 text-center">No queries yet</p>
            }
          </div>
        </div>
      </div>

      {/* ── Intelligence shortcuts ── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Intelligence Shortcuts</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: AlertTriangle, label: 'Risk & Vendors',    sub: 'Vendor dependency alerts',      color: 'text-red-600',    bg: 'bg-red-50',    tab: 'risk'      },
            { icon: TrendingUp,    label: 'Knowledge Velocity',sub: '12-month activity trend',       color: 'text-teal-600',   bg: 'bg-teal-50',   tab: 'velocity'  },
            { icon: Users,         label: 'Experts At Risk',   sub: 'Inactive SMEs & vendors',       color: 'text-amber-600',  bg: 'bg-amber-50',  tab: 'experts'   },
            { icon: FileText,      label: 'Coverage Score',    sub: 'Documentation grade A–F',       color: 'text-indigo-600', bg: 'bg-indigo-50', tab: 'coverage'  },
          ].map(item => (
            <button
              key={item.tab}
              onClick={() => navigate('/intelligence')}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-left hover:border-teal-300 transition-colors group"
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${item.bg} mb-3`}>
                <item.icon size={18} className={item.color} />
              </div>
              <p className="text-sm font-semibold text-gray-800 group-hover:text-teal-700">{item.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}
