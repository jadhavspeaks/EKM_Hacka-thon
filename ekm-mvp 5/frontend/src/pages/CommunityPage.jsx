/**
 * CommunityPage
 * Leaderboard, weekly digest, activity feed.
 */
import { useState, useEffect } from 'react'
import { T } from '../theme'
import { getLeaderboard, getDigest } from '../api'
import { Spinner } from '../components/UI'
import {
  Trophy, TrendingUp, Users, FileText, MessageSquare,
  Flag, Star, Activity, BookOpen, Zap, Award,
  ArrowUp, BarChart2, Calendar, RefreshCw
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function Medal({ rank }) {
  if (rank === 1) return <span className="text-xl">🥇</span>
  if (rank === 2) return <span className="text-xl">🥈</span>
  if (rank === 3) return <span className="text-xl">🥉</span>
  return <span className="text-sm font-mono text-slate-400 w-6 text-center">#{rank}</span>
}

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="rounded-xl border p-4 flex items-center gap-4"
      style={{ background: T.bgCard, borderColor: T.border }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: color + '18' }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <p className="text-2xl font-bold" style={{ color: T.text }}>{value}</p>
        <p className="text-xs font-medium" style={{ color: T.textMuted }}>{label}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>{sub}</p>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------
function LeaderboardPanel({ data, loading }) {
  const [view, setView] = useState('total')

  const sorted = [...(data || [])].sort((a, b) => {
    if (view === 'docs')  return b.doc_contributions - a.doc_contributions
    if (view === 'notes') return b.annotations - a.annotations
    if (view === 'flags') return b.flags - a.flags
    return b.total - a.total
  }).slice(0, 15)

  const VIEWS = [
    { k: 'total', l: 'Overall' },
    { k: 'docs',  l: 'Docs' },
    { k: 'notes', l: 'Notes' },
    { k: 'flags', l: 'Flags' },
  ]

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: T.bgCard, borderColor: T.border }}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: T.border }}>
        <div className="flex items-center gap-2">
          <Trophy size={15} style={{ color: T.blue }} />
          <span className="font-semibold text-sm" style={{ color: T.text }}>Knowledge Contributors</span>
        </div>
        <div className="flex gap-1">
          {VIEWS.map(v => (
            <button key={v.k} onClick={() => setView(v.k)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
              style={view === v.k
                ? { background: T.blue, color: '#fff' }
                : { background: T.bg, color: T.textMuted }}>
              {v.l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-12">
          <Users size={32} className="mx-auto mb-3" style={{ color: T.border }} />
          <p className="text-sm" style={{ color: T.textMuted }}>No contributors yet.</p>
          <p className="text-xs mt-1" style={{ color: T.textMuted }}>Be the first — open a document and add a note.</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: T.border }}>
          {sorted.map((person, i) => {
            const score = view === 'docs' ? person.doc_contributions
              : view === 'notes' ? person.annotations
              : view === 'flags' ? person.flags
              : person.total
            const maxScore = sorted[0] ? (
              view === 'docs' ? sorted[0].doc_contributions
              : view === 'notes' ? sorted[0].annotations
              : view === 'flags' ? sorted[0].flags
              : sorted[0].total
            ) : 1
            const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0

            return (
              <div key={person.name} className="px-5 py-3 flex items-center gap-4 group hover:bg-slate-50 transition-colors">
                <div className="w-8 flex justify-center flex-shrink-0">
                  <Medal rank={i + 1} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold truncate" style={{ color: T.text }}>{person.name}</span>
                    <span className="text-xs font-bold ml-2 flex-shrink-0" style={{ color: T.blue }}>{score} pts</span>
                  </div>
                  <div className="w-full rounded-full h-1.5" style={{ background: T.border }}>
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: T.teal }} />
                  </div>
                  <div className="flex gap-3 mt-1.5 text-xs" style={{ color: T.textMuted }}>
                    <span>{person.doc_contributions} docs</span>
                    <span>{person.annotations} notes</span>
                    <span>{person.flags} flags</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Digest
// ---------------------------------------------------------------------------
function DigestPanel({ data, loading }) {
  if (loading) return (
    <div className="rounded-xl border flex justify-center py-10" style={{ background: T.bgCard, borderColor: T.border }}>
      <Spinner />
    </div>
  )
  if (!data) return null

  const { stats, trending_topics, sources_this_week, top_annotators, recent_activity } = data

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<FileText size={18}/>} label="New documents" value={stats.new_documents} sub="this week" color={T.teal} />
        <StatCard icon={<RefreshCw size={18}/>} label="Updated docs" value={stats.updated_documents} sub="this week" color={T.blue} />
        <StatCard icon={<MessageSquare size={18}/>} label="New notes" value={stats.new_annotations} sub="community added" color="#8b5cf6" />
        <StatCard icon={<Flag size={18}/>} label="Flags raised" value={stats.new_flags} sub="need attention" color="#f59e0b" />
      </div>

      {/* Trending topics */}
      {trending_topics?.length > 0 && (
        <div className="rounded-xl border p-5" style={{ background: T.bgCard, borderColor: T.border }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} style={{ color: T.teal }} />
            <span className="text-sm font-semibold" style={{ color: T.text }}>Trending Topics</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {trending_topics.map(t => (
              <span key={t.topic}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border"
                style={{ background: T.teal + '12', borderColor: T.teal + '30', color: T.teal }}>
                {t.topic}
                <span className="opacity-60 text-xs">{t.activity}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Source activity */}
      {sources_this_week?.length > 0 && (
        <div className="rounded-xl border p-5" style={{ background: T.bgCard, borderColor: T.border }}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={14} style={{ color: T.blue }} />
            <span className="text-sm font-semibold" style={{ color: T.text }}>New Documents by Source</span>
          </div>
          <div className="space-y-2">
            {sources_this_week.map(s => {
              const max = sources_this_week[0].count
              const pct = Math.round((s.count / max) * 100)
              const COLORS = { confluence: '#7c3aed', jira: '#ea580c', github: '#334155', sharepoint: '#2563eb' }
              const col = COLORS[s.source] || T.blue
              return (
                <div key={s.source} className="flex items-center gap-3">
                  <span className="w-24 text-xs font-medium capitalize flex-shrink-0" style={{ color: T.textMuted }}>{s.source}</span>
                  <div className="flex-1 rounded-full h-2" style={{ background: T.border }}>
                    <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: col }} />
                  </div>
                  <span className="text-xs font-bold w-8 text-right" style={{ color: T.text }}>{s.count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Top annotators */}
      {top_annotators?.length > 0 && (
        <div className="rounded-xl border p-5" style={{ background: T.bgCard, borderColor: T.border }}>
          <div className="flex items-center gap-2 mb-4">
            <Star size={14} style={{ color: '#f59e0b' }} />
            <span className="text-sm font-semibold" style={{ color: T.text }}>Top Contributors This Week</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {top_annotators.map((a, i) => (
              <div key={a.name}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border"
                style={{ background: T.bg, borderColor: T.border }}>
                {i === 0 && <span>⭐</span>}
                <span className="text-xs font-semibold" style={{ color: T.text }}>{a.name}</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                  style={{ background: T.teal + '18', color: T.teal }}>{a.count} notes</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent activity feed */}
      {recent_activity?.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ background: T.bgCard, borderColor: T.border }}>
          <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: T.border }}>
            <Activity size={14} style={{ color: T.blue }} />
            <span className="text-sm font-semibold" style={{ color: T.text }}>Recent Activity</span>
          </div>
          <div className="divide-y" style={{ borderColor: T.border }}>
            {recent_activity.map((a, i) => (
              <div key={i} className="px-5 py-3 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: T.blue + '18' }}>
                  <MessageSquare size={11} style={{ color: T.blue }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold" style={{ color: T.text }}>{a.author}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded border font-medium capitalize"
                      style={{ background: T.bg, borderColor: T.border, color: T.textMuted }}>{a.annotation_type}</span>
                  </div>
                  <p className="text-xs line-clamp-2" style={{ color: T.textMuted }}>{a.text}</p>
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: T.textMuted }}>
                  {new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {recent_activity?.length === 0 && trending_topics?.length === 0 && (
        <div className="text-center py-8">
          <Calendar size={28} className="mx-auto mb-3" style={{ color: T.border }} />
          <p className="text-sm" style={{ color: T.textMuted }}>Quiet week — no activity yet.</p>
          <p className="text-xs mt-1" style={{ color: T.textMuted }}>Open any document and add a note to get started.</p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function CommunityPage() {
  const [tab, setTab]             = useState('digest')
  const [leaderboard, setLeaderboard] = useState([])
  const [digest, setDigest]       = useState(null)
  const [loadingLB, setLoadingLB] = useState(false)
  const [loadingDig, setLoadingDig] = useState(false)

  useEffect(() => {
    setLoadingLB(true)
    getLeaderboard().then(r => setLeaderboard(r.data.leaderboard || [])).catch(() => {}).finally(() => setLoadingLB(false))
    setLoadingDig(true)
    getDigest().then(r => setDigest(r.data)).catch(() => {}).finally(() => setLoadingDig(false))
  }, [])

  const TABS = [
    { k: 'digest',      l: 'Weekly Digest', icon: <Zap size={14}/> },
    { k: 'leaderboard', l: 'Leaderboard',   icon: <Trophy size={14}/> },
  ]

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6" style={{ background: T.bg }}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1" style={{ color: T.text }}>Community</h1>
          <p className="text-sm" style={{ color: T.textMuted }}>
            Collective contributions — flags, notes, corrections — and knowledge activity across all sources.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {TABS.map(t => (
            <button key={t.k} onClick={() => setTab(t.k)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={tab === t.k
                ? { background: T.blue, color: '#fff', boxShadow: `0 0 0 3px ${T.blue}22` }
                : { background: T.bgCard, color: T.textMuted, border: `1px solid ${T.border}` }}>
              {t.icon} {t.l}
            </button>
          ))}
        </div>

        {/* Panels */}
        {tab === 'digest'      && <DigestPanel data={digest} loading={loadingDig} />}
        {tab === 'leaderboard' && <LeaderboardPanel data={leaderboard} loading={loadingLB} />}
      </div>
    </div>
  )
}
