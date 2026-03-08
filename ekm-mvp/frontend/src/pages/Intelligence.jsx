import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { getAnalyticsStats, getHealthReport, getRiskReport, getOnboardingPath, getKnowledgeGa
import { Spinner, SourceBadge } from '../components/UI'
// ── Helpers ──────────────────────────────────────────────────────────────────
const RISK_COLOR = {
critical: 'text-red-600 bg-red-50 border-red-200',
high: 'text-orange-600 bg-orange-50 border-orange-200',
medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
low: 'text-green-600 bg-green-50 border-green-200',
}
const RISK_ICON = { critical: ' ', high: ' ', medium: ' ', low: ' ' }
const HEALTH_COLOR = { good: 'text-green-600', warning: 'text-yellow-600', poor: 'text-red-60
const HEALTH_ICON = { good: ' ', warning: ' ', poor: ' ' }
// Teams deep link -- opens a chat with the person
function teamsLink(name, domain) {
// Convert "Gandhi, Mihir [TECH]" → "mihir.gandhi@citi.com" (best effort)
const clean = name
.replace(/\[TECH.*?\]/gi, '')
.replace(/\(.*?\)/g, '')
.trim()
// Try "Lastname, Firstname" format
const commaMatch = clean.match(/^([^,]+),\s*(.+)$/)
if (commaMatch) {
const last = commaMatch[1].trim().toLowerCase().replace(/\s+/g, '.')
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
className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border borde
title={`Chat with ${name} on Teams`}
>
</a>
Teams
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
// ── Analytics Tab ─────────────────────────────────────────────────────────────
function AnalyticsTab() {
const [data, setData] = useState(null)
const [loading, setLoading] = useState(true)
const [days, setDays] = useState(30)
useEffect(() => {
setLoading(true)
getAnalyticsStats(days).then(r => { setData(r.data); setLoading(false) })
.catch(() => setLoading(false))
}, [days])
if (loading) return <div className="flex justify-center py-12"><Spinner /></div>
if (!data) return <div className="text-gray-500 text-sm">No analytics data yet. Start sea
const maxVol = Math.max(...(data.daily_volume?.map(d => d.count) || [1]), 1)
return (
<div className="space-y-6">
{/* Time range */}
<div className="flex gap-2">
{[7, 30, 90].map(d => (
<button key={d} onClick={() => setDays(d)}
className={`px-3 py-1 text-sm rounded-full border transition-colors ${
days === d ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600
}`}>
{d}d
</button>
))}
</div>
{/* Summary stats */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
<StatCard label="Total Searches" value={data.total_searches?.toLocaleString()} colo
<StatCard label="Unique Queries" value={data.unique_queries?.toLocaleString()} colo
<StatCard label="Zero Results" value={data.zero_result_count} sub={`${data.zero_r
<StatCard label="Sources Used" value={data.source_filter_usage?.length} color="te
</div>
{/* Daily volume chart */}
{data.daily_volume?.length > 0 && (
<div className="card p-4">
<h3 className="text-sm font-semibold text-gray-700 mb-3">Daily Search Volume</h3>
<div className="flex items-end gap-1 h-24">
{data.daily_volume.slice(-30).map(d => (
<div key={d.date} className="flex-1 flex flex-col items-center gap-1 group rela
<div
className="w-full bg-teal-400 rounded-t hover:bg-teal-600 transition-colors
style={{ height: `${Math.max(4, (d.count / maxVol) * 88)}px` }}
/>
<div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-80
{d.date}: {d.count} searches
</div>
</div>
))}
</div>
</div>
)}
<div className="grid md:grid-cols-2 gap-4">
{/* Top queries */}
<div className="card p-4">
<h3 className="text-sm font-semibold text-gray-700 mb-3"> {data.top_queries?.length === 0
? <p className="text-xs text-gray-400">No searches yet</p>
: data.top_queries?.map((q, i) => (
Top Queries</h3>
<div key={q.query} className="flex items-center gap-2 py-1.5 border-b border-gr
<span className="text-xs text-gray-400 w-4">{i + 1}</span>
<span className="text-sm text-gray-800 flex-1 truncate">{q.query}</span>
<span className="text-xs font-medium text-teal-600 bg-teal-50 px-2 py-0.5 rou
</div>
))
}
</div>
{/* Zero result queries */}
<div className="card p-4">
<h3 className="text-sm font-semibold text-gray-700 mb-3"> Zero Result Queries</h3
<p className="text-xs text-gray-400 mb-2">Knowledge gaps -- these searches found not
{data.zero_result_queries?.length === 0
? <p className="text-xs text-green-600"> All searches returned results!</p>
: data.zero_result_queries?.map((q, i) => (
<div key={q.query} className="flex items-center gap-2 py-1.5 border-b border-gr
<span className="text-xs text-red-400 w-4">{i + 1}</span>
<span className="text-sm text-gray-800 flex-1 truncate">{q.query}</span>
<span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 round
</div>
))
}
</div>
</div>
{/* Source filter usage */}
{data.source_filter_usage?.length > 0 && (
<div className="card p-4">
<h3 className="text-sm font-semibold text-gray-700 mb-3"> Search by Source</h3>
<div className="flex flex-wrap gap-2">
{data.source_filter_usage.map(s => (
<div key={s.source} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rou
<SourceBadge type={s.source === 'all' ? null : s.source} />
<span className="text-sm font-medium text-gray-700">{s.count} searches</span>
</div>
))}
</div>
</div>
)}
</div>
)
}
// ── Health Tab ────────────────────────────────────────────────────────────────
function HealthTab() {
const [data, setData] = useState(null)
const [loading, setLoading] = useState(true)
useEffect(() => {
getHealthReport().then(r => { setData(r.data); setLoading(false) })
.catch(() => setLoading(false))
}, [])
if (loading) return <div className="flex justify-center py-12"><Spinner /></div>
if (!data) return <div className="text-gray-500 text-sm">Could not load health report.</d
return (
<div className="space-y-6">
{/* Summary */}
<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
<StatCard label="Total Documents" value={data.total_docs?.toLocaleString()} color="te
<StatCard label="Jira–Confluence Links" value={`${data.audit?.linked_pct}%`}
sub={`${data.audit?.linked_count} of ${data.audit?.jira_total} tickets`}
color={data.audit?.linked_pct > 50 ? 'text-green-600' : 'text-orange-500'} />
<StatCard label="Stale Docs (180d+)" value={data.stale_docs?.length}
color={data.stale_docs?.length > 20 ? 'text-red-500' : 'text-yellow-600'} />
</div>
{/* Freshness per source */}
<div className="card p-4">
<SectionTitle sub="% of documents updated within each time window">Content Freshness
<div className="space-y-3">
{data.freshness?.map(f => (
<div key={f.source} className="space-y-1">
<div className="flex items-center justify-between">
<div className="flex items-center gap-2">
<SourceBadge type={f.source} />
<span className="text-sm text-gray-700">{f.total.toLocaleString()} docs</sp
</div>
<span className={`text-xs font-medium ${HEALTH_COLOR[f.health]}`}>
{HEALTH_ICON[f.health]} {f.health}
</span>
</div>
<div className="flex gap-2 text-xs text-gray-500">
<span className="text-green-600 font-medium">{f.fresh_30d_pct}% &lt;30d</span
<span>·</span>
<span className="text-blue-600 font-medium">{f.fresh_90d_pct}% &lt;90d</span>
<span>·</span>
<span>{f.fresh_365d_pct}% &lt;1yr</span>
</div>
<div className="w-full bg-gray-100 rounded-full h-2">
<div className="bg-teal-500 h-2 rounded-full" style={{ width: `${f.fresh_90d_
</div>
</div>
))}
</div>
</div>
{/* Knowledge audit */}
<div className="card p-4">
<SectionTitle sub="How well are Jira tickets documented in Confluence?">Knowledge Aud
<div className="flex items-center gap-4">
<div className="flex-1">
<div className="w-full bg-gray-100 rounded-full h-4">
<div className="bg-teal-500 h-4 rounded-full transition-all"
style={{ width: `${data.audit?.linked_pct || 0}%` }} />
</div>
<div className="flex justify-between text-xs text-gray-500 mt-1">
<span className="text-teal-600 font-medium">{data.audit?.linked_count} linked</
<span className="text-red-400">{data.audit?.unlinked_count} unlinked</span>
</div>
</div>
<div className={`text-2xl font-bold ${data.audit?.linked_pct > 50 ? 'text-green-600
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
<div key={i} className="flex items-center gap-3 py-1.5 border-b border-gray-50
<SourceBadge type={doc.source_type} />
<a href={doc.url} target="_blank" rel="noreferrer"
className="text-sm text-blue-600 hover:underline flex-1 truncate">{doc.titl
<span className="text-xs text-red-400 shrink-0">{doc.days_old}d old</span>
</div>
))}
</div>
</div>
)}
{/* Never searched */}
{data.never_searched?.length > 0 && (
<div className="card p-4">
<SectionTitle sub="Indexed content that no one has ever searched for">Untouched Kno
<div className="space-y-2">
{data.never_searched.slice(0, 10).map((doc, i) => (
<div key={i} className="flex items-center gap-3 py-1.5 border-b border-gray-50
<SourceBadge type={doc.source_type} />
<a href={doc.url} target="_blank" rel="noreferrer"
className="text-sm text-blue-600 hover:underline flex-1 truncate">{doc.titl
<span className="text-xs text-gray-400 shrink-0">{doc.days_ingested}d ago</sp
</div>
))}
</div>
</div>
)}
</div>
)
}
// ── Risk Tab ──────────────────────────────────────────────────────────────────
function RiskTab({ teamsDomain }) {
const [data, setData] = useState(null)
const [loading, setLoading] = useState(true)
const [filter, setFilter] = useState('all')
const [expanded, setExpanded] = useState({})
useEffect(() => {
getRiskReport().then(r => { setData(r.data); setLoading(false) })
.catch(() => setLoading(false))
}, [])
const toggleExpand = (topic) =>
setExpanded(prev => ({ ...prev, [topic]: !prev[topic] }))
if (loading) return <div className="flex justify-center py-12"><Spinner /></div>
if (!data) return <div className="text-gray-500 text-sm">Could not load risk report.</div
const s = data.summary || {}
const topics = (data.topics || []).filter(t =>
filter === 'all' || t.risk_level === filter
)
return (
<div className="space-y-6">
{/* Summary cards */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
<StatCard label="Critical Topics" value={s.critical_topics} color="text-red-600" />
<StatCard label="High Risk Topics" value={s.high_risk_topics} color="text-orange-500"
<StatCard label="Vendor Contributors" value={s.vendor_contributors}
sub={`${s.vendor_pct}% of all contributors`} color="text-purple-600" />
<StatCard label="Internal Contributors" value={s.internal_contributors} color="text-g
</div>
{/* Vendor dependency banner */}
{s.vendor_pct > 40 && (
<div className="bg-red-50 border border-red-200 rounded-lg p-4">
<div className="flex items-start gap-3">
<span className="text-2xl"> </span>
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
filter === f ? 'bg-navy-700 text-white border-navy-700' : 'bg-white text-gray-6
}`}>
{f === 'all' ? 'All Topics' : `${RISK_ICON[f]} ${f}`}
</button>
))}
</div>
{/* Topics */}
<div className="space-y-3">
{topics.length === 0 && <p className="text-sm text-gray-400">No topics match this fil
{topics.map(topic => (
<div key={topic.topic} className={`card border ${RISK_COLOR[topic.risk_level]}`}>
{/* Header -- always visible */}
<div className="p-4 cursor-pointer" onClick={() => toggleExpand(topic.topic)}>
<div className="flex items-start justify-between gap-3 mb-3">
<div>
<div className="flex items-center gap-2">
<span className="font-semibold text-gray-900 capitalize">{topic.topic}</s
<span className={`text-xs px-2 py-0.5 rounded-full border font-medium cap
{RISK_ICON[topic.risk_level]} {topic.risk_level}
</span>
</div>
<div className="text-xs text-gray-500 mt-0.5">
{topic.unique_people} contributor{topic.unique_people !== 1 ? 's' : ''} ·
· <span className="text-blue-500">{expanded[topic.topic] ? '▲ collapse' :
</div>
</div>
<div className="text-right shrink-0">
<div className="text-sm font-bold text-purple-700">{topic.vendor_pct}% vend
<div className="text-xs text-green-700">{topic.internal_pct}% internal</div
</div>
</div>
{/* Vendor/internal bar */}
<div className="w-full bg-green-100 rounded-full h-2 mb-3">
<div className="bg-purple-500 h-2 rounded-full" style={{ width: `${topic.vend
</div>
{/* Contributors with Teams button */}
<div className="flex flex-wrap gap-2">
{topic.top_contributors.map(c => (
<div key={c.name} className={`flex items-center gap-1.5 text-xs px-2 py-1 r
c.type === 'vendor' ? 'bg-purple-50 border-purple-200 text-purple-800'
c.type === 'internal' ? 'bg-green-50 border-green-200 text-green-800' :
'bg-gray-50 border-gray-200 text-gray-600'
}`}>
<span>{c.type === 'vendor' ? ' ' : c.type === 'internal' ? ' <span className="font-medium">{c.name}</span>
<span className="text-gray-400 mr-1">{c.count}</span>
<TeamsButton name={c.name} domain={teamsDomain} />
</div>
' : ' '}<
))}
</div>
</div>
{/* Expanded -- source documents */}
{expanded[topic.topic] && topic.top_docs?.length > 0 && (
<div className="border-t border-gray-100 px-4 py-3 bg-gray-50 rounded-b-lg">
<p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wid
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
<span className="text-sm text-gray-600 flex-1 truncate">{doc.title}</
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
<div className="border-t border-gray-100 px-4 py-3 bg-gray-50 rounded-b-lg text
No document links available for this topic.
</div>
)}
</div>
))}
</div>
</div>
)
}
// ── People Tab ────────────────────────────────────────────────────────────────
function PeopleTab({ teamsDomain }) {
const [query, setQuery] = useState('')
const [results, setResults] = useState(null)
const [profile, setProfile] = useState(null)
const [loading, setLoading] = useState(false)
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
className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline
/>
</form>
<button type="submit" className="btn-primary text-sm px-4">Search</button>
{loading && <div className="flex justify-center py-8"><Spinner /></div>}
{/* Person profile */}
{profile && !loading && (
<div className="card p-5 space-y-4">
<div className="flex items-start justify-between">
<div>
<div className="flex items-center gap-2 flex-wrap">
<h2 className="text-lg font-bold text-gray-900">{profile.name}</h2>
<span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
profile.type === 'vendor' ? 'bg-purple-50 border-purple-200 text-purple-7
profile.type === 'internal' ? 'bg-green-50 border-green-200 text-green-700'
'bg-gray-50 border-gray-200 text-gray-600'
}`}>
{profile.type === 'vendor' ? ' Vendor [TECH NE]' :
profile.type === 'internal' ? ' Internal [TECH]' : ' Unknown'}
</span>
</div>
<TeamsButton name={profile.name} domain={teamsDomain} />
<p className="text-sm text-gray-500 mt-0.5">
{profile.total_docs} documents · Last active: {profile.last_active || 'unknow
</p>
</div>
<button onClick={() => setProfile(null)} className="text-gray-400 hover:text-gray
</div>
{/* Roles */}
{profile.roles?.length > 0 && (
<div className="flex flex-wrap gap-2">
{profile.roles.map(r => (
<span key={r} className="text-xs bg-teal-50 text-teal-700 border border-teal-
))}
</div>
)}
{/* By source -- static display only */}
<div>
<h3 className="text-sm font-semibold text-gray-700 mb-2">Contributions by Source<
<div className="flex flex-wrap gap-3">
{Object.entries(profile.by_source || {}).map(([src, count]) => (
<div
key={src}
className="flex items-center gap-1.5 text-sm bg-white border border-gray-20
>
<SourceBadge type={src} />
<span className="font-semibold text-gray-700">{count} docs</span>
</div>
))}
</div>
</div>
{/* Top topics -- CLICKABLE → triggers search for that topic */}
{profile.top_topics?.length > 0 && (
<div>
<h3 className="text-sm font-semibold text-gray-700 mb-2">
Top Topics <span className="text-xs text-gray-400 font-normal">-- click </h3>
<div className="flex flex-wrap gap-2">
{profile.top_topics.map(t => (
<button
key={t.topic}
onClick={() => {
setProfile(null)
setQuery(t.topic)
searchPeople(t.topic).then(r => setResults(r.data))
to sea
}}
className="text-xs bg-teal-50 text-teal-700 border border-teal-200 hover:
>
{t.topic} <span className="text-teal-400">({t.count})</span>
</button>
))}
</div>
</div>
)}
{/* Recent docs */}
{profile.recent_docs?.length > 0 && (
<div>
<h3 className="text-sm font-semibold text-gray-700 mb-2">Recent Contributions</
<div className="space-y-2">
{profile.recent_docs.map((doc, i) => (
<div key={i} className="flex items-center gap-2 py-1.5 border-b border-gray
<SourceBadge type={doc.source_type} />
{doc.url ? (
<a href={doc.url} target="_blank" rel="noreferrer"
className="text-sm text-blue-600 hover:underline flex-1 truncate">{do
) : (
<span className="text-sm text-gray-600 flex-1 truncate">{doc.title}</sp
)}
</div>
<span className="text-xs text-gray-400 shrink-0">{doc.updated_at}</span>
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
{results.total} contributor{results.total !== 1 ? 's' : ''} found for "{results.q
</p>
<div className="grid md:grid-cols-2 gap-3">
{results.results?.map(person => (
<div key={person.name} className="card p-4 hover:shadow-md transition-shadow">
<div className="flex items-start justify-between gap-2 mb-2">
<div>
<div className="flex items-center gap-2 flex-wrap">
<span className="font-medium text-gray-900 text-sm">{person.name}</span
{person.type === 'vendor' && (
<span className="text-xs bg-purple-50 text-purple-700 border border-p
)}
{person.type === 'internal' && (
<span className="text-xs bg-green-50 text-green-700 border border-gre
)}
</div>
<p className="text-xs text-gray-400 mt-0.5">Last active: {person.last_act
</div>
<span className="text-sm font-bold text-teal-600 shrink-0">{person.doc_coun
</div>
<div className="flex flex-wrap gap-1 mb-3">
{person.sources?.map(s => <SourceBadge key={s} type={s} />)}
</div>
<div className="flex items-center gap-2">
<button
onClick={() => handlePersonClick(person.name)}
className="flex-1 text-xs bg-teal-50 text-teal-700 border border-teal-200
>
View Profile
</button>
<TeamsButton name={person.name} domain={teamsDomain} />
</div>
</div>
))}
</div>
</div>
)}
{results?.total === 0 && !loading && (
<div className="text-center py-8 text-gray-400">No contributors found for "{results.q
)}
</div>
)
}
// ── Onboarding Tab ────────────────────────────────────────────────────────────
function OnboardingTab() {
const [topic, setTopic] = useState('')
const [data, setData] = useState(null)
const [loading, setLoading] = useState(false)
const handleSearch = async (e) => {
e.preventDefault()
if (!topic.trim()) return
setLoading(true)
try {
const r = await getOnboardingPath(topic)
setData(r.data)
} finally {
setLoading(false)
}
}
const SECTION_BG = {
confluence: 'bg-purple-50 border-purple-200',
sharepoint: 'bg-blue-50 border-blue-200',
github: 'bg-gray-50 border-gray-200',
jira: 'bg-orange-50 border-orange-200',
}
return (
<div className="space-y-4">
<div className="bg-teal-50 border border-teal-200 rounded-lg p-4 text-sm text-teal-800"
<strong> Learning Path Generator</strong> -- Enter any topic or system name.
EKM builds a structured reading path: Confluence docs first, then process docs, then
Jira tickets are shown last as reference only -- not primary learning material.
</div>
<form onSubmit={handleSearch} className="flex gap-2">
<input
value={topic}
onChange={e => setTopic(e.target.value)}
placeholder="e.g. payments pipeline, BIC ETL, CGME dashboard..."
className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline
/>
<button type="submit" className="btn-primary text-sm px-4">Generate Path</button>
{data?.total > 0 && (
<button type="button"
onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/join/${
className="text-sm bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-
title="Copy shareable new joiner link">
Share
</button>
)}
</form>
{loading && <div className="flex justify-center py-8"><Spinner /></div>}
{data && !loading && (
<div className="space-y-4">
<p className="text-sm text-gray-500">
Learning path for <strong>"{data.topic}"</strong> -- {data.total} documents </p>
across
{data.sections?.length === 0 && (
<div className="text-center py-8 text-gray-400">No documents found for this topic
)}
{data.sections?.map(section => (
<div key={section.source_type} className={`rounded-lg border p-4 ${SECTION_BG[sec
<div className="flex items-center gap-2 mb-3">
<span className="font-semibold text-gray-800">{section.label}</span>
<span className="text-xs text-gray-500">{section.docs.length} doc{section.doc
{section.is_reference && (
<span className="text-xs bg-orange-100 text-orange-600 border border-orange
Reference only -- not primary reading
</span>
)}
</div>
<div className="space-y-2">
{section.docs.map((doc, i) => (
<div key={i} className="flex items-start gap-3 bg-white rounded-lg p-3 shad
<div className="flex items-center justify-center w-6 h-6 rounded-full bg-
{doc.read_order}
</div>
<div className="flex-1 min-w-0">
{doc.url ? (
<a href={doc.url} target="_blank" rel="noreferrer"
className="text-sm font-medium text-blue-600 hover:underline ) : (
<span className="text-sm font-medium text-gray-700 line-clamp-1">{doc
)}
line-c
<div className="flex items-center gap-2 mt-0.5">
{doc.author && <span className="text-xs text-gray-400">by {doc.author
{doc.days_old && (
<span className={`text-xs ${doc.stale ? 'text-red-400' : 'text-gray
{doc.stale ? ' ' : ''}{doc.days_old}d ago
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
// ── Knowledge Gaps Tab ────────────────────────────────────────────────────────
function GapsTab() {
const [data, setData] = useState(null)
const [loading, setLoading] = useState(true)
useEffect(() => {
getKnowledgeGaps().then(r => { setData(r.data); setLoading(false) })
.catch(() => setLoading(false))
}, [])
if (loading) return <div className="flex justify-center py-12"><Spinner /></div>
if (!data) return <div className="text-gray-500 text-sm">Could not load gaps report.</div
const SEV_COLOR = {
critical: 'text-red-600 bg-red-50 border-red-200',
high: 'text-orange-600 bg-orange-50 border-orange-200',
medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
}
const SEV_ICON = { critical: ' ', high: ' ', medium: ' ' }
return (
<div className="space-y-5">
<div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-8
<strong> Knowledge Gaps</strong> -- Systems and projects that have active Jira ticke
but <strong>zero documentation</strong> in Confluence or SharePoint. These are your b
</div>
<div className="grid grid-cols-3 gap-3">
<StatCard label="Total Gaps" value={data.total_gaps} color="text-yellow-600" />
<StatCard label="Critical Gaps" value={data.critical_gaps} color="text-red-600" />
<StatCard label="High Priority" value={data.high_gaps} color="text-orange-500" />
</div>
{data.gaps?.length === 0 ? (
<div className="text-center py-10 text-green-600">
No knowledge gaps detected -- all active systems have documentation!
</div>
) : (
<div className="space-y-3">
{data.gaps.map((gap, i) => (
<div key={i} className={`card p-4 border ${SEV_COLOR[gap.severity]}`}>
<div className="flex items-start justify-between gap-3 mb-2">
<div className="flex items-center gap-2">
<span className="font-semibold text-gray-900 capitalize">{gap.topic}</span>
<span className={`text-xs px-2 py-0.5 rounded-full border font-medium capit
{SEV_ICON[gap.severity]} {gap.severity}
</span>
</div>
<div className="text-xs text-gray-500 shrink-0">
{gap.jira_tickets > 0 && <span className="mr-2"> {gap.jira_tickets} ticke
{gap.github_refs > 0 && <span> {gap.github_refs} GitHub refs</span>}
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
className="text-xs text-blue-600 hover:underline truncate">{doc.tit
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
)}
</div>
)
}
// ── Experts At Risk Tab ───────────────────────────────────────────────────────
function ExpertsAtRiskTab({ teamsDomain }) {
const [data, setData] = useState(null)
const [loading, setLoading] = useState(true)
useEffect(() => {
getExpertsAtRisk().then(r => { setData(r.data); setLoading(false) })
.catch(() => setLoading(false))
}, [])
if (loading) return <div className="flex justify-center py-12"><Spinner /></div>
if (!data) return <div className="text-gray-500 text-sm">Could not load experts report.</
const RISK_COLOR = {
critical: 'border-red-200 bg-red-50',
high: 'border-orange-200 bg-orange-50',
medium: 'border-yellow-200 bg-yellow-50',
}
const RISK_ICON = { critical: ' ', high: ' ', medium: ' ' }
return (
<div className="space-y-5">
<div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
<strong> Expert Knowledge At Risk</strong> -- Contributors who haven't been active i
or external vendors whose knowledge leaves when their contract ends.
Act before the knowledge is gone.
</div>
<div className="grid grid-cols-3 gap-3">
<StatCard label="At Risk Experts" value={data.total_at_risk} color="text-orange-600"
<StatCard label="Critical" value={data.critical_count} color="text-red-600" />
<StatCard label="High Risk" value={data.high_count} color="text-orange-500"
</div>
{data.experts?.length === 0 ? (
<div className="text-center py-10 text-green-600">
No at-risk experts detected.
</div>
) : (
<div className="space-y-3">
{data.experts.map((expert, i) => (
<div key={i} className={`card p-4 border ${RISK_COLOR[expert.risk_level]}`}>
<div className="flex items-start justify-between gap-3 mb-2">
<div>
<div className="flex items-center gap-2 flex-wrap">
<span className="font-semibold text-gray-900">{expert.name}</span>
<span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
expert.type === 'vendor' ? 'bg-purple-50 border-purple-200 text-purple-
'bg-green-50 border-green-200 text-green-700'
}`}>
{expert.type === 'vendor' ? ' Vendor' : ' Internal'}
</span>
<span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${
expert.risk_level === 'critical' ? 'bg-red-50 border-red-200 text-red-6
expert.risk_level === 'high' ? 'bg-orange-50 border-orange-200 text
'bg-yellow-50 border-yellow-200 tex
}`}>
{RISK_ICON[expert.risk_level]} {expert.risk_level}
</span>
</div>
<TeamsButton name={expert.name} domain={teamsDomain} />
<p className="text-xs text-gray-500 mt-0.5">
{expert.doc_count} docs · {expert.topic_count} topics ·
Last active: {expert.last_active || 'unknown'}
{expert.days_inactive < 999 && ` (${expert.days_inactive}d ago)`}
</p>
</div>
</div>
<p className="text-xs text-gray-700 mb-2 font-medium">{expert.recommendation}</
{expert.risk_factors?.length > 0 && (
<div className="flex flex-wrap gap-1 mb-2">
{expert.risk_factors.map(f => (
<span key={f} className="text-xs bg-white border border-gray-200 text-gra
))}
</div>
)}
{expert.top_topics?.length > 0 && (
<div className="flex flex-wrap gap-1">
{expert.top_topics.map(t => (
<span key={t} className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rou
))}
</div>
)}
</div>
))}
</div>
)}
</div>
)
}
// ── Coverage Tab ──────────────────────────────────────────────────────────────
function CoverageTab() {
const [data, setData] = useState(null)
const [loading, setLoading] = useState(true)
const [filter, setFilter] = useState('all')
useEffect(() => {
getCoverageReport().then(r => { setData(r.data); setLoading(false) })
.catch(() => setLoading(false))
}, [])
if (loading) return <div className="flex justify-center py-12"><Spinner /></div>
if (!data) return <div className="text-gray-500 text-sm">Could not load coverage report.<
const GRADE_COLOR = {
A: 'text-green-700 bg-green-50 border-green-200',
B: 'text-teal-700 bg-teal-50 border-teal-200',
C: 'text-yellow-700 bg-yellow-50 border-yellow-200',
D: 'text-orange-700 bg-orange-50 border-orange-200',
F: 'text-red-700 bg-red-50 border-red-200',
}
const SCORE_BAR = (score) =>
score >= 80 ? 'bg-green-500' :
score >= 60 ? 'bg-teal-500' :
score >= 40 ? 'bg-yellow-500' :
score >= 20 ? 'bg-orange-500' : 'bg-red-500'
const filtered = filter === 'all'
? data.coverage
: data.coverage?.filter(c => c.grade === filter)
return (
<div className="space-y-5">
<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800"
<strong> Documentation Coverage Score</strong> -- How well documented is each Scored 0–100: Confluence (40pts) + SharePoint (30pts) + GitHub files (20pts) + Worst scores shown first.
</div>
system
Jira (
{/* Summary */}
<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
<StatCard label="Average Score" value={`${data.average_score}/100`}
color={data.average_score >= 60 ? 'text-green-600' : data.average_score >= 40 ? 'te
<StatCard label="Total Topics" value={data.total_topics} color="text-gray-700" />
<div className="card p-4">
<div className="text-sm font-medium text-gray-700 mb-2">Grade Distribution</div>
<div className="flex gap-2 flex-wrap">
{Object.entries(data.grade_distribution || {}).map(([grade, count]) => (
<span key={grade} className={`text-xs font-bold px-2 py-1 rounded border {grade}: {count}
</span>
${GRAD
))}
</div>
</div>
</div>
{/* Grade filter */}
<div className="flex gap-2 flex-wrap">
{['all', 'F', 'D', 'C', 'B', 'A'].map(g => (
<button key={g} onClick={() => setFilter(g)}
className={`px-3 py-1 text-xs rounded-full border transition-colors ${
filter === g ? 'bg-navy-700 text-white border-navy-700' : 'bg-white text-gray-6
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
<span className={`text-sm font-bold px-2.5 py-1 rounded border ${GRADE_COLOR[it
{item.grade}
</span>
<span className="font-medium text-gray-900 capitalize flex-1">{item.topic}</spa
<span className="text-sm font-bold text-gray-700">{item.score}/100</span>
</div>
<div className="w-full bg-gray-100 rounded-full h-2 mb-2">
<div className={`h-2 rounded-full ${SCORE_BAR(item.score)}`} style={{ width: `$
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
<p className="text-xs text-orange-600 mt-1.5"> {item.recommendation}</p>
)}
</div>
))}
</div>
</div>
)
}
// ── Knowledge Velocity Tab ───────────────────────────────────────────────────
function VelocityTab() {
const [input, setInput] = useState('')
const [topic, setTopic] = useState('')
const [data, setData] = useState(null)
const [loading, setLoading] = useState(false)
const [error, setError] = useState(null)
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
const COLORS = { confluence: '#8b5cf6', jira: '#f97316', github: '#6b7280', sharepoint: '#3
const TREND_COLOR = data?.trend === 'up' ? 'text-green-600' : data?.trend === 'down' const TREND_ICON = data?.trend === 'up' ? ' ' : data?.trend === 'down' ? ' ' : ' '
? 'tex
return (
<div className="space-y-5">
<div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-sm text-indig
<strong> Knowledge Velocity</strong> -- See how knowledge activity trends over time.
Trending up = healthy, growing system. Trending down = knowledge going stale or team
</div>
<form onSubmit={handleSearch} className="flex gap-2">
<input value={input} onChange={e => setInput(e.target.value)}
placeholder="Filter by topic (leave blank for org-wide)..."
className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline
<button type="submit" className="btn-primary text-sm px-4">View</button>
{topic && <button type="button" onClick={() => { setInput(''); setTopic(''); load('')
className="text-xs text-gray-400 hover:text-gray-600 px-2">Clear</button>}
</form>
{loading && <div className="flex justify-center py-8"><Spinner /></div>}
{error && (
<div className="text-center py-8 text-red-500 text-sm">{error}</div>
)}
{data && !loading && !data.has_data && (
<div className="card p-6 text-center space-y-3">
<div className="text-3xl"> </div>
<div className="text-base font-semibold text-gray-700">No activity data found</div>
<div className="text-sm text-gray-500 max-w-md mx-auto">
EKM found <strong>{data.total_docs}</strong> documents but could not read dates f
This usually means documents haven't been synced yet, or dates are stored in an u
</div>
<div className="text-xs text-gray-400 bg-gray-50 rounded p-3 text-left font-mono">
total_docs: {data.total_docs} &nbsp;·&nbsp; parsed_dates: {data.parsed_count}
<br/>
<span className="text-teal-600">→ Try running a full sync first: Dashboard </div>
<a href="/api/intelligence/velocity/debug" target="_blank"
className="text-xs text-teal-600 underline hover:text-teal-700 block">
Open velocity debug (shows raw date formats in DB) →
</a>
</div>
→ Sync
)}
{data && !loading && data.has_data && (
<div className="space-y-4">
{/* Trend summary */}
<div className="grid grid-cols-3 gap-3">
<StatCard label="Trend" value={`${TREND_ICON} ${data.trend}`} color={TREND_COLOR}
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
Monthly Activity -- {topic || 'All Topics'}
</h3>
<span className="text-xs text-gray-400">
{data.total.toLocaleString()} docs · {data.series?.length} months
</span>
</div>
<div className="flex items-end gap-1 h-32">
{data.series?.map((s, i) => {
const total = s.confluence + s.jira + s.github + s.sharepoint
return (
<div key={i} className="flex-1 flex flex-col items-center gap-0.5 group rel
<div className="w-full flex flex-col-reverse" style={{ height: '112px' }}
{['confluence','jira','github','sharepoint'].map(src => {
const h = total ? Math.round((s[src] / maxVal) * 112) : 0
return h > 0 ? (
<div key={src} style={{ height: `${h}px`, backgroundColor: COLORS[s
className="w-full first:rounded-b last:rounded-t" />
) : null
})}
</div>
<span className="text-gray-400 rotate-45 origin-left mt-1 whitespace-nowr
style={{ fontSize: '9px' }}>{s.label.split(' ')[0]}</span>
{/* Tooltip */}
<div className="absolute bottom-full mb-1 hidden group-hover:block <div className="font-semibold mb-0.5">{s.label}: {total}</div>
{['confluence','jira','github','sharepoint'].map(src => s[src] > <div key={src}>{src}: {s[src]}</div>
bg-gra
0 && (
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
// ── Handover Tracker Tab ──────────────────────────────────────────────────────
function HandoverTab({ teamsDomain }) {
const [name, setName] = useState('')
const [input, setInput] = useState('')
const [data, setData] = useState(null)
const [progress, setProgress] = useState({})
const [loading, setLoading] = useState(false)
const [saving, setSaving] = useState(false)
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
const totalItems = data?.sections?.reduce((s, sec) => s + sec.items.length, 0) || 0
const doneItems = Object.values(progress).filter(Boolean).length
const donePct = totalItems ? Math.round(doneItems / totalItems * 100) : 0
const SECTION_ICON = {
documentation: ' ', open_tickets: ' ', code: ' ', process_docs: ' '
}
return (
<div className="space-y-4">
<div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-orang
<strong> Handover Tracker</strong> -- Search for a person to generate their full han
Tick items off as knowledge is transferred. Progress is saved automatically.
</div>
<form onSubmit={handleSearch} className="flex gap-2">
<input value={input} onChange={e => setInput(e.target.value)}
placeholder="Enter contributor name e.g. Jadhav, Nishantchandra [TECH]..."
className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline
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
data.type === 'vendor' ? 'bg-purple-50 border-purple-200 text-purple-700'
'bg-green-50 border-green-200 text-green-700'
}`}>
{data.type === 'vendor' ? ' Vendor [TECH NE]' : ' Internal [TECH]'}
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
<span key={t} className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 round
))}
</div>
)}
</div>
{/* Sections */}
{data.sections?.length === 0 && (
<p className="text-sm text-gray-400 text-center py-6">No documents found for this
)}
{data.sections?.map(section => (
<div key={section.id} className="card overflow-hidden">
<div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center
<span>{SECTION_ICON[section.id] || ' '}</span>
<span className="font-semibold text-gray-800 text-sm">{section.title}</span>
<span className="text-xs text-gray-400 ml-1">
{section.items.filter((_,i) => progress[`${section.id}-${i}`]).length}/{sec
</span>
</div>
<p className="px-4 py-2 text-xs text-gray-500 border-b border-gray-50">{section
<div className="divide-y divide-gray-50">
{section.items.map((item, i) => {
const key = `${section.id}-${i}`
const done = !!progress[key]
return (
<div key={i} className={`flex items-start gap-3 px-4 py-3 transition-colo
<button onClick={() => toggleItem(section.id, i)}
className="shrink-0 mt-0.5 text-gray-300 hover:text-teal-500 transiti
{done
? <span className="text-teal-500 text-lg">✓</span>
: <span className="text-gray-300 text-lg">○</span>}
</button>
<div className="flex-1 min-w-0">
{item.doc.url ? (
<a href={item.doc.url} target="_blank" rel="noreferrer"
className={`text-sm hover:underline ${done ? 'line-through {item.doc.title}
</a>
) : (
<span className={`text-sm ${done ? 'line-through text-gray-400' : '
{item.doc.title}
</span>
text-g
)}
<div className="flex items-center gap-2 mt-0.5 flex-wrap">
{item.doc.status && (
<span className="text-xs bg-orange-50 text-orange-600 px-1.5 py-0
{item.doc.status}
</span>
)}
{item.doc.priority && (
<span className="text-xs text-gray-400">{item.doc.priority}</span
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
<div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
<div className="text-3xl mb-1"> </div>
<p className="font-semibold text-green-800">Handover complete!</p>
<p className="text-sm text-green-700 mt-1">All items for {data.name} have been
</div>
)}
</div>
)}
{data?.total_docs === 0 && !loading && (
<div className="text-center py-8 text-gray-400">No documents found for "{name}".</div
)}
</div>
)
}
// ── Main Intelligence Page -- Sidebar Layout ──────────────────────────────────
const NAV_GROUPS = [
{
group: 'Search Intelligence',
items: [
{ id: 'analytics', icon: ' ', label: 'Analytics', sub: 'Queries, trends, gaps'
{ id: 'velocity', icon: ' ', label: 'Velocity', sub: '12-month activity char
]
},
{
group: 'Risk & Governance',
items: [
{ id: 'risk', icon: ' ', label: 'Risk & Vendors', sub: 'Dependency alerts'
{ id: 'gaps', icon: ' ', label: 'Knowledge Gaps', sub: 'Undocumented systems'
{ id: 'experts', icon: ' ', label: 'Experts At Risk', sub: 'Inactive & vendor SME
]
},
{
group: 'Quality',
items: [
{ id: 'health', icon: ' ', label: 'Health', sub: 'Freshness & audits'
{ id: 'coverage', icon: ' ', label: 'Coverage Score', sub: 'Grade A–F per system'
]
},
{
group: 'People & Enablement',
items: [
{ id: 'handover', icon: ' ', label: 'Handover Tracker', sub: 'Knowledge transfer pac
{ id: 'people', icon: ' ', label: 'People', sub: 'Contributor profiles'
{ id: 'onboarding', icon: ' ', label: 'Learning Path', sub: 'Shareable onboarding p
]
},
]
// Page titles/descriptions for the content header
const TAB_META = {
analytics: { title: 'Search Analytics', desc: 'Query volume, top searches, and zero-
velocity: { title: 'Knowledge Velocity', desc: '12-month activity trend across all i
risk: { title: 'Risk & Vendor Intelligence', desc: 'Vendor dependency alerts and know
gaps: { title: 'Knowledge Gaps', desc: 'Active systems with no corresponding
experts: { title: 'Experts At Risk', desc: 'SMEs inactive 90d+ or held entirely
health: { title: 'Knowledge Health', desc: 'Content freshness, Jira↔Confluence a
coverage: { title: 'Coverage Score', desc: 'Documentation completeness graded A–
handover: { title: 'Handover Tracker', desc: 'Structured knowledge transfer checkl
people: { title: 'People', desc: 'Contributor profiles, topic ownershi
onboarding: { title: 'Learning Path', desc: 'Curated reading path for any system
}
export default function Intelligence() {
const location = useLocation()
const [tab, setTab] = useState(location.state?.tab || 'analytics')
const [teamsDomain, setTeamsDomain] = useState('citi.com')
// Update tab if navigated to with a specific tab in state
useEffect(() => {
if (location.state?.tab) setTab(location.state.tab)
}, [location.state?.tab])
useEffect(() => {
getConfig().then(r => { if (r.data?.teams_domain) setTeamsDomain(r.data.teams_domain) })
.catch(() => {})
}, [])
const meta = TAB_META[tab] || {}
return (
<div className="flex gap-0 h-full min-h-screen" style={{height:'calc(100vh - 0px)'}}>
{/* ── Sidebar ── */}
<aside className="w-56 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col pt
<div className="px-4 mb-5">
<p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Intellige
</div>
{NAV_GROUPS.map(group => (
<div key={group.group} className="mb-5">
<p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider
{group.group}
</p>
{group.items.map(item => {
const active = tab === item.id
return (
<button
key={item.id}
onClick={() => setTab(item.id)}
className={`w-full text-left px-4 py-2.5 flex items-start gap-2.5 transitio
active
? 'bg-teal-600 text-white'
: 'text-slate-300 hover:bg-slate-800 hover:text-white'
}`}
>
<span className="text-base leading-none mt-0.5">{item.icon}</span>
<span>
<span className="block text-sm font-medium leading-tight">{item.label}</s
<span className={`block text-xs leading-tight mt-0.5 ${active ? 'text-tea
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
<main className="flex-1 overflow-y-auto bg-gray-50 p-6">
{/* Content header */}
<div className="mb-5 pb-4 border-b border-gray-200">
<h1 className="text-xl font-bold text-gray-900">{meta.title}</h1>
<p className="text-sm text-gray-400 mt-0.5">{meta.desc}</p>
</div>
{/* Tab content */}
{tab === 'analytics' && <AnalyticsTab />}
{tab === 'velocity' && <VelocityTab />}
{tab === 'risk' && <RiskTab teamsDomain={teamsDomain} />}
{tab === 'health' && <HealthTab />}
{tab === 'gaps' && <GapsTab />}
{tab === 'experts' && <ExpertsAtRiskTab teamsDomain={teamsDomain} />}
{tab === 'coverage' && <CoverageTab />}
{tab === 'handover' && <HandoverTab teamsDomain={teamsDomain} />}
}
)
{tab === 'people' && <PeopleTab teamsDomain={teamsDomain} />}
{tab === 'onboarding' && <OnboardingTab />}
</main>
</div>