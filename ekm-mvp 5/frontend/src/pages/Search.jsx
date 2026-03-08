import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../ThemeContext'
import { searchDocs, getPersonProfile } from '../api'
import { SourceBadge, EmptyState, Spinner, TeamsButton } from '../components/UI'
import {
  Search as SearchIcon, ExternalLink, User, Clock, Tag,
  ChevronDown, ChevronUp, X, Zap, Users, AlertCircle,
  FileText, GitBranch, MessageSquare, BookOpen
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import DocumentDrawer from '../components/DocumentDrawer'

const ROLE_ICONS = {
  'Confluence Author': '📄',
  'Jira Reporter':     '🎫',
  'Jira Assignee':     '👤',
  'Issue Resolver':    '✅',
  'Commit Author':     '💻',
  'PR Author':         '🔀',
  'SharePoint Author': '📁',
}

// ── Person Profile Banner (intent detected) ──────────────────────────────────
function PersonBanner({ name, onClose }) {
  const { T } = useTheme()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getPersonProfile(name)
      .then(r => setProfile(r.data))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false))
  }, [name])

  const isVendor = profile?.type === 'vendor'
  const isInternal = profile?.type === 'internal'

  return (
    <>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-5">
      {/* Banner header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between"
        style={{ background: '#061829', borderBottom:'1px solid #1a3050' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-teal-100 border border-teal-200 flex items-center justify-center font-bold text-teal-700 text-sm">
            {(profile?.name || name).split(/[\s,]+/).filter(Boolean).map(w => w[0]).slice(0,2).join('')}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-900 text-sm">
                {loading ? 'Looking up profile…' : (profile?.name || name)}
              </span>
              {profile && (
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                  isVendor   ? 'bg-purple-50 text-purple-700 border-purple-200' :
                  isInternal ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                               'text-slate-400'
                }`}>
                  {isVendor ? '🔵 Vendor' : isInternal ? '🟢 Internal' : '⚪ Unknown'}
                </span>
              )}
              {profile && <TeamsButton name={profile.name} domain="citi.com"/>}
            </div>
            {profile && (
              <p className="text-xs text-slate-500 mt-0.5">
                {profile.total_docs} documents · Last active: {profile.last_active || 'unknown'}
              </p>
            )}
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
          <X size={15}/>
        </button>
      </div>

      {loading && <div className="flex justify-center py-5"><Spinner/></div>}

      {profile && !loading && (
        <div className="p-5 grid grid-cols-3 gap-5 text-sm">
          {/* By source */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Contributions</p>
            <div className="space-y-2">
              {Object.entries(profile.by_source || {}).map(([src, count]) => (
                <div key={src} className="flex items-center justify-between">
                  <SourceBadge type={src}/>
                  <span className="font-semibold text-slate-700 text-xs">{count}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Roles */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Roles</p>
            <div className="flex flex-wrap gap-1.5">
              {(profile.roles || []).map(r => (
                <span key={r} className="text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2 py-1 rounded-full">
                  {ROLE_ICONS[r] || '•'} {r}
                </span>
              ))}
            </div>
          </div>
          {/* Top topics */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Top Topics</p>
            <div className="flex flex-wrap gap-1.5">
              {(profile.top_topics || []).slice(0, 6).map(t => (
                <span key={t.topic} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                  {t.topic} <span className="text-slate-400">({t.count})</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {!profile && !loading && (
        <div className="px-5 py-4 text-sm text-slate-500">
          No profile found for "<strong>{name}</strong>" — showing related documents below.
        </div>
      )}
    </div>

    {/* Document Preview Drawer */}
    <DocumentDrawer docId={drawerDocId} onClose={() => setDrawerDocId(null)} />
    </>
  )
}

// ── Compact SME sidebar ───────────────────────────────────────────────────────
function SMESidebar({ smes }) {
  const { T } = useTheme()
  const [expanded, setExpanded] = useState(false)
  if (!smes?.length) return null
  const visible = expanded ? smes : smes.slice(0, 3)
  const maxScore = smes[0]?.score || 1

  return (
    <div className="rounded-xl overflow-hidden sticky top-4" style={{background:T.bgCard, border:`1px solid ${T.border}`, boxShadow:"0 1px 2px rgba(0,0,0,0.05)", borderRadius:"12px"}}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between" style={{borderBottom:"1px solid #1a3050", background:"#061829"}}>
        <div className="flex items-center gap-2">
          <Users size={13} className="text-indigo-500"/>
          <span className="text-xs font-semibold text-slate-700">Best People To Ask</span>
        </div>
        <span className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded-full font-medium">
          {smes.length}
        </span>
      </div>

      <div className="divide-y divide-slate-50">
        {visible.map((sme, i) => {
          const isVendor = sme.type === 'vendor'
          const barW = Math.round((sme.score / maxScore) * 100)
          const medals = ['🥇','🥈','🥉']
          const b = sme.contribution_breakdown || {}
          return (
            <div key={sme.name} className="px-3 py-3 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm shrink-0">{i < 3 ? medals[i] : <span className="text-xs" style={{color:"#64748b"}}>{i+1}</span>}</span>
                <span className="text-xs font-medium text-slate-800 truncate flex-1">{sme.name}</span>
              </div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
                  isVendor
                    ? 'bg-purple-50 text-purple-600 border border-purple-100'
                    : sme.type === 'internal'
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {isVendor ? 'Vendor' : sme.type === 'internal' ? 'Internal' : '—'}
                </span>
                <span className="text-xs" style={{color:"#64748b"}}>{sme.doc_count} docs</span>
              </div>
              <div className="h-1 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                <div className="h-full rounded-full bg-indigo-300" style={{ width: `${barW}%` }}/>
              </div>
              <div className="text-xs text-slate-400 flex flex-wrap gap-x-2">
                {b.authored  > 0 && <span>{b.authored} authored</span>}
                {b.assigned  > 0 && <span>{b.assigned} assigned</span>}
                {b.commented > 0 && <span>{b.commented} comments</span>}
              </div>
              {sme.last_active && (
                <div className="text-xs text-slate-300 mt-1 flex items-center gap-1">
                  <Clock size={9}/>{sme.last_active}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {smes.length > 3 && (
        <button onClick={() => setExpanded(e => !e)}
          className="w-full py-2 text-xs text-slate-400 hover:bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-1 transition-colors">
          {expanded ? <><ChevronUp size={11}/> Less</> : <><ChevronDown size={11}/> {smes.length - 3} more</>}
        </button>
      )}
    </div>
  )
}

// ── Best Answer snippet ───────────────────────────────────────────────────────
function BestAnswer({ answer }) {
  const { T } = useTheme()
  if (!answer?.trim()) return null
  return (
    <div className="flex gap-3 bg-teal-50 border border-teal-200 rounded-xl p-4 mb-4">
      <div className="w-6 h-6 rounded-lg bg-teal-500 flex items-center justify-center shrink-0 mt-0.5">
        <Zap size={12} className="text-white"/>
      </div>
      <div>
        <p className="text-xs font-semibold text-teal-700 mb-1">Best Match Excerpt</p>
        <p className="text-sm text-teal-900 leading-relaxed">{answer}</p>
      </div>
    </div>
  )
}

// ── Result card ───────────────────────────────────────────────────────────────
function ResultCard({ doc, onClick }) {
  const { T } = useTheme()
  const m = doc.metadata || {}
  const preview = doc.content_preview || doc.content?.slice(0, 200) || ''

  return (
    <div className="rounded-xl p-4 cursor-pointer transition-all" style={{background:T.bgCard, border:`1px solid ${T.border}`, boxShadow:"0 1px 2px rgba(0,0,0,0.05)", borderRadius:"12px"}}
      onClick={onClick}>
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          <SourceBadge type={doc.source_type}/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              {doc.url ? (
                <a href={doc.url} target="_blank" rel="noreferrer"
                  className="font-semibold text-slate-900 text-sm hover:text-teal-700 transition-colors line-clamp-2">
                  {doc.title}
                </a>
              ) : (
                <span className="font-semibold text-slate-900 text-sm line-clamp-2">{doc.title}</span>
              )}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs" style={{color:"#64748b"}}>{doc.source}</span>
                {doc.author && (
                  <span className="text-xs" style={{color:"#64748b"}}>· {doc.author}</span>
                )}
                {m.status && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full" style={{background:"#f1f5f9", color:"#64748b"}}>{m.status}</span>
                )}
                {m.priority && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                    m.priority === 'High' || m.priority === 'Critical'
                      ? 'bg-red-50 text-red-600 border border-red-100'
                      : 'bg-orange-50 text-orange-600 border border-orange-100'
                  }`}>{m.priority}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {doc.updated_at && (
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {new Date(doc.updated_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'2-digit'})}
                </span>
              )}
              {doc.url && (
                <a href={doc.url} target="_blank" rel="noreferrer"
                  className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:bg-teal-50 hover:border-teal-300 text-slate-500 hover:text-teal-600 transition-all">
                  <ExternalLink size={12}/>
                </a>
              )}
            </div>
          </div>
          {preview && (
            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mt-1.5">{preview}</p>
          )}
          {doc.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {doc.tags.slice(0,5).map(t => (
                <span key={t} className="text-xs px-1.5 py-0.5 rounded-full" style={{background:"#0a1628", color:"#64748b", border:"1px solid #1a3050"}}>
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── GitHub card ───────────────────────────────────────────────────────────────
function GitHubCard({ doc, onClick }) {
  const { T } = useTheme()
  const m = doc.metadata || {}
  const ct = m.content_type || 'commit'
  const Icon = ct === 'pull_request' ? GitBranch : ct === 'commit' ? MessageSquare : FileText

  return (
    <div className="rounded-xl p-4 cursor-pointer transition-all" style={{background:T.bgCard, border:`1px solid ${T.border}`, boxShadow:"0 1px 2px rgba(0,0,0,0.05)", borderRadius:"12px"}}
      onClick={onClick}>
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5 w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center">
          <Icon size={11} className="text-slate-300"/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              {doc.url ? (
                <a href={doc.url} target="_blank" rel="noreferrer"
                  className="font-semibold text-slate-900 text-sm hover:text-teal-700 transition-colors line-clamp-1">
                  {doc.title}
                </a>
              ) : (
                <span className="font-semibold text-slate-900 text-sm">{doc.title}</span>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-mono">{ct}</span>
                {m.author_name && <span className="text-xs" style={{color:"#64748b"}}>{m.author_name}</span>}
                {doc.source && <span className="text-xs" style={{color:"#64748b"}}>· {doc.source}</span>}
              </div>
            </div>
            {doc.url && (
              <a href={doc.url} target="_blank" rel="noreferrer"
                className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:bg-teal-50 hover:border-teal-300 text-slate-500 hover:text-teal-600 transition-all shrink-0">
                <ExternalLink size={12}/>
              </a>
            )}
          </div>
          {doc.content_preview && (
            <p className="text-xs text-slate-400 line-clamp-1 font-mono mt-1.5 bg-slate-50 px-2 py-1 rounded">
              {doc.content_preview}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({ color, label, count, icon: Icon }) {
  const { T } = useTheme()
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-1 h-4 rounded-full" style={{ background: color }}/>
      {Icon && <Icon size={13} style={{ color }}/>}
      <span className="text-xs font-bold uppercase tracking-wider" style={{ color }}>
        {label}
      </span>
      {count !== undefined && (
        <span className="text-xs" style={{color:"#64748b"}}>{count} result{count !== 1 ? 's' : ''}</span>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SEARCH PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const SOURCES = ['', 'confluence', 'jira', 'github']
const SRC_LABELS = { '': 'All Sources', confluence: 'Confluence', jira: 'Jira', github: 'GitHub', sharepoint: 'SharePoint' }
const SRC_COLORS = { confluence: '#7c3aed', jira: '#ea580c', github: '#475569', sharepoint: '#2563eb' }

export default function SearchPage() {
  const [query, setQuery]           = useState('')
  const [inputVal, setInputVal]     = useState('')
  const [sourceFilter, setFilter]   = useState('')
  const [results, setResults]       = useState(null)
  const [loading, setLoading]       = useState(false)
  const [page, setPage]             = useState(1)
  const [personCard, setPersonCard] = useState(null)
  const [drawerDocId, setDrawerDocId] = useState(null)
  const inputRef = useRef(null)

  const doSearch = async (q, src, p = 1) => {
    if (!q?.trim()) return
    setLoading(true)
    setResults(null)
    setPersonCard(null)
    try {
      const res = await searchDocs(q, src, p)
      setResults(res.data)
      setPage(p)
      if (res.data?.person_query) setPersonCard(res.data.person_query)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleSubmit = (e) => {
    e?.preventDefault()
    if (!inputVal.trim()) return
    setQuery(inputVal)
    setFilter('')
    doSearch(inputVal, '', 1)
  }

  const handleSourceFilter = (src) => {
    setFilter(src)
    doSearch(query, src, 1)
  }

  const clear = () => {
    setInputVal(''); setQuery(''); setResults(null); setPersonCard(null)
    inputRef.current?.focus()
  }

  // Sorted results
  const sorted = results ? [...(results.results || [])].sort((a, b) => {
    if (a.source_type === 'confluence' && b.source_type !== 'confluence') return -1
    if (b.source_type === 'confluence' && a.source_type !== 'confluence') return 1
    return 0
  }) : []
  const confDocs  = sorted.filter(d => d.source_type === 'confluence')
  const otherDocs = sorted.filter(d => d.source_type !== 'confluence')

  return (
    <div className="min-h-full" style={{background:T.bg}}>

      {/* ── Search header ── */}
      <div className="px-6 py-5" style={{background:"#0d1f35", borderBottom:"1px solid #1a3050"}}>
        <div className="max-w-5xl mx-auto">
          <h1 className="text-lg font-bold mb-1" style={{color:T.textPri}}>Search</h1>
          <p className="text-xs mb-4" style={{color:"#64748b"}}>BM25 · entity extraction · SME ranking · Confluence-first</p>

          {/* Search bar */}
          <form onSubmit={handleSubmit}>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <SearchIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input
                  ref={inputRef}
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  placeholder='Search knowledge base… or try "what Jadhav has worked on"'
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm focus:outline-none transition-all" style={{background:T.bgMid, border:`1px solid ${T.border}`, color:T.textPri, fontFamily:T.font}}
                />
                {inputVal && (
                  <button type="button" onClick={clear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                    <X size={14}/>
                  </button>
                )}
              </div>
              <button type="submit"
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-xl transition-colors">
                Search
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-5">

        {/* Source filter pills — only show after search */}
        {query && (
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <span className="text-xs text-slate-500 font-medium">Filter:</span>
            {SOURCES.map(src => (
              <button key={src} onClick={() => handleSourceFilter(src)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                  sourceFilter === src
                    ? 'text-white border-transparent'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
                style={sourceFilter === src
                  ? { background: src ? SRC_COLORS[src] : '#0d9488', borderColor: 'transparent' }
                  : {}}>
                {SRC_LABELS[src]}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Spinner/>
            <p className="text-sm text-slate-500">Searching knowledge base…</p>
          </div>
        )}

        {!loading && !results && !query && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center mb-4">
              <SearchIcon size={28} className="text-teal-500"/>
            </div>
            <h2 className="text-base font-semibold text-slate-700 mb-2">Search your knowledge base</h2>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              Find documents, Jira issues, GitHub commits, and Confluence pages. Ask natural language questions or search by keyword.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 justify-center">
              {['Ingestion pipeline', 'what Jadhav has worked on', 'scorecard', 'BIC ETL'].map(s => (
                <button key={s} onClick={() => { setInputVal(s); setQuery(s); doSearch(s, '', 1) }}
                  className="text-xs bg-white text-teal-700 border border-teal-200 px-3 py-1.5 rounded-full hover:bg-teal-50 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {results && !loading && (
          <div>
            {/* Result count */}
            <p className="text-sm text-slate-500 mb-4">
              <span className="font-semibold text-slate-800">{results.total}</span> results for{' '}
              <span className="italic text-slate-700">"{results.query}"</span>
              {results.fuzzy && <span className="ml-2 text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">fuzzy match</span>}
            </p>

            {/* Person query banner — FULL WIDTH, above everything */}
            {personCard && (
              <PersonBanner name={personCard} onClose={() => setPersonCard(null)}/>
            )}

            {/* Best answer snippet */}
            {results.best_answer && !personCard && <BestAnswer answer={results.best_answer}/>}

            {/* 2-col: results + SME sidebar */}
            <div className="flex gap-5 items-start">

              {/* Left: results */}
              <div className="flex-1 min-w-0 space-y-5">
                {sorted.length === 0 ? (
                  <EmptyState icon="🔍" title="No results" subtitle="Try different keywords or remove the source filter."/>
                ) : (
                  <>
                    {/* Confluence first — Official Documentation */}
                    {confDocs.length > 0 && (
                      <div>
                        <SectionHeader
                          color="#7c3aed"
                          icon={BookOpen}
                          label="Official Documentation"
                          count={confDocs.length}
                        />
                        <div className="space-y-2.5">
                          {confDocs.map(doc => <ResultCard key={doc.id} doc={doc} onClick={() => setDrawerDocId(doc.id)}/>)}
                        </div>
                      </div>
                    )}

                    {/* Other sources */}
                    {otherDocs.length > 0 && (
                      <div>
                        {confDocs.length > 0 && (
                          <SectionHeader
                            color="#94a3b8"
                            label="Related Activity"
                            count={otherDocs.length}
                          />
                        )}
                        <div className="space-y-2.5">
                          {otherDocs.map(doc =>
                            doc.source_type === 'github'
                              ? <GitHubCard key={doc.id} doc={doc} onClick={() => setDrawerDocId(doc.id)}/>
                              : <ResultCard key={doc.id} doc={doc} onClick={() => setDrawerDocId(doc.id)}/>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Pagination */}
                {results.total > results.page_size && (
                  <div className="flex justify-center items-center gap-3 pt-2">
                    <button className="px-4 py-2 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40"
                      disabled={page === 1} onClick={() => doSearch(query, sourceFilter, page - 1)}>
                      Previous
                    </button>
                    <span className="text-sm text-slate-500">
                      Page {page} of {results.total_pages ?? 1}
                    </span>
                    <button className="px-4 py-2 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40"
                      disabled={page >= results.total_pages ?? 1}
                      onClick={() => doSearch(query, sourceFilter, page + 1)}>
                      Next
                    </button>
                  </div>
                )}
              </div>

              {/* Right: SME sidebar — hidden on person queries */}
              {results.smes?.length > 0 && !personCard && (
                <div className="w-56 shrink-0">
                  <SMESidebar smes={results.smes}/>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
