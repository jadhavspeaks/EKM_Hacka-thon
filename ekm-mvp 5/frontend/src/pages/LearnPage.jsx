/**
 * LearnPage — /learn
 * Standalone multi-topic learning path builder.
 * Shareable URL: /learn?topics=payments+pipeline,BIC+ETL,CGME
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getOnboardingPath } from '../api'
import {
  X, BookOpen, ExternalLink, RefreshCw, Check,
  ChevronDown, ChevronRight, ArrowLeft, Layers, Tag,
  FileText, GitCommit, Boxes, AlertCircle, Clock, Share2
} from 'lucide-react'

// ── Theme (inline, same as app) ──────────────────────────────────────────────
const _tid = (() => { try { return localStorage.getItem('ekm-theme') || 'arctic' } catch(e) { return 'arctic' } })()
const T = _tid === 'slate' ? {
  bg: '#f4f6f8', bgCard: '#ffffff', bgMid: '#f0f4f8', bgDeep: '#1e2a3a',
  border: '#dde3eb', borderLt: '#e4eaf2',
  blue: '#2563eb', teal: '#059669', orange: '#ea580c',
  red: '#f43f5e', green: '#10b981', gold: '#f59e0b', purple: '#8b5cf6',
  textPri: '#1e2a3a', textSec: '#4a6278', textDim: '#7a90a4',
  font: "'IBM Plex Sans',sans-serif", mono: "'IBM Plex Mono',monospace",
} : {
  bg: '#f4f6f9', bgCard: '#ffffff', bgMid: '#f0f5fa', bgDeep: '#0d1117',
  border: '#dde3ec', borderLt: '#e8edf4',
  blue: '#0052cc', teal: '#0891b2', orange: '#ea580c',
  red: '#dc2626', green: '#16a34a', gold: '#d97706', purple: '#7c3aed',
  textPri: '#0d1117', textSec: '#4a5568', textDim: '#8896a7',
  font: "'IBM Plex Sans',sans-serif", mono: "'IBM Plex Mono',monospace",
}

const SRC_META = {
  confluence: { label: 'Confluence', color: '#0052cc', icon: BookOpen,   bg: '#eff6ff' },
  sharepoint: { label: 'SharePoint', color: '#0078d4', icon: Boxes,      bg: '#e8f4fd' },
  github:     { label: 'GitHub',     color: '#6e40c9', icon: GitCommit,  bg: '#f5f0ff' },
  jira:       { label: 'Jira',       color: '#0052cc', icon: Tag,        bg: '#fff7ed' },
}

function SourceIcon({ type, size = 13 }) {
  const m = SRC_META[type] || SRC_META.confluence
  const Icon = m.icon
  return <Icon size={size} style={{ color: m.color }} />
}

function SourceBadge({ type }) {
  const m = SRC_META[type] || SRC_META.confluence
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: m.bg, color: m.color, border: `1px solid ${m.color}25` }}>
      <SourceIcon type={type} size={10} />
      {m.label}
    </span>
  )
}

function DocCard({ doc, index }) {
  const age = doc.days_old
  return (
    <a href={doc.url} target="_blank" rel="noreferrer"
      className="group flex items-start gap-3 p-3 rounded-xl transition-all hover:shadow-sm"
      style={{ background: T.bgCard, border: `1px solid ${T.border}`, textDecoration: 'none' }}>
      <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5"
        style={{ background: T.bgMid, border: `1px solid ${T.border}` }}>
        <span className="text-xs font-bold" style={{ color: T.textDim, fontFamily: T.mono }}>
          {index}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-snug group-hover:underline"
            style={{ color: T.textPri }}>{doc.title}</p>
          <ExternalLink size={12} style={{ color: T.textDim, flexShrink: 0, marginTop: 2 }}
            className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <SourceBadge type={doc.source_type} />
          {doc.source && (
            <span className="text-xs" style={{ color: T.textDim }}>{doc.source}</span>
          )}
          {age != null && (
            <span className="flex items-center gap-0.5 text-xs"
              style={{ color: doc.stale ? T.orange : T.textDim }}>
              <Clock size={9} />
              {age === 0 ? 'today' : age < 7 ? `${age}d ago` : age < 30 ? `${Math.round(age / 7)}w ago` : `${Math.round(age / 30)}mo ago`}
            </span>
          )}
          {doc.stale && (
            <span className="text-xs px-1.5 py-0.5 rounded"
              style={{ background: T.orange + '15', color: T.orange }}>
              may be outdated
            </span>
          )}
        </div>
      </div>
    </a>
  )
}

// By-topic accordion
function TopicSection({ topic, result, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  const total = result?.sections?.reduce((s, sec) => s + sec.docs.length, 0) || 0

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ border: `1px solid ${T.border}`, background: T.bgCard }}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 transition-all hover:opacity-80"
        style={{ background: T.bgMid }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: T.teal }} />
          <span className="font-bold text-base" style={{ color: T.textPri }}>{topic}</span>
          {total > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: T.teal + '20', color: T.teal }}>
              {total} docs
            </span>
          )}
        </div>
        {open ? <ChevronDown size={16} style={{ color: T.textDim }} />
               : <ChevronRight size={16} style={{ color: T.textDim }} />}
      </button>

      {open && (
        <div className="p-4">
          {!result ? (
            <div className="flex items-center gap-2 py-4 justify-center">
              <RefreshCw size={14} className="animate-spin" style={{ color: T.textDim }} />
              <span className="text-sm" style={{ color: T.textDim }}>Searching…</span>
            </div>
          ) : total === 0 ? (
            <div className="text-center py-6">
              <AlertCircle size={20} style={{ color: T.textDim, margin: '0 auto 8px' }} />
              <p className="text-sm" style={{ color: T.textDim }}>No documents found for this topic</p>
            </div>
          ) : (
            <div className="space-y-4">
              {result.sections.map(sec => (
                <div key={sec.source_type}>
                  <div className="flex items-center gap-2 mb-2">
                    <SourceIcon type={sec.source_type} />
                    <span className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: T.textDim, fontFamily: T.mono }}>{sec.label}</span>
                    {sec.is_reference && (
                      <span className="text-xs px-1.5 py-0.5 rounded"
                        style={{ background: T.gold + '20', color: T.gold }}>reference only</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {sec.docs.map((doc, i) => (
                      <DocCard key={doc.url || i} doc={doc} index={doc.read_order} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// By-source grouped view
function SourceSection({ sourceType, docs }) {
  const [open, setOpen] = useState(true)
  const m = SRC_META[sourceType] || SRC_META.confluence

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ border: `1px solid ${m.color}30`, background: T.bgCard }}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4"
        style={{ background: m.bg }}>
        <div className="flex items-center gap-3">
          <SourceIcon type={sourceType} size={16} />
          <span className="font-bold" style={{ color: m.color }}>{m.label}</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: m.color + '20', color: m.color }}>{docs.length} docs</span>
        </div>
        {open ? <ChevronDown size={16} style={{ color: m.color }} />
               : <ChevronRight size={16} style={{ color: m.color }} />}
      </button>
      {open && (
        <div className="p-4 space-y-2">
          {docs.map((doc, i) => (
            <DocCard key={doc.url || i} doc={doc} index={i + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Topic chip input ──────────────────────────────────────────────────────────
function TopicInput({ topics, onChange }) {
  const [input, setInput] = useState('')
  const inputRef = useRef(null)

  const addTopic = useCallback((val) => {
    const v = val.trim()
    if (!v || topics.includes(v)) return
    onChange([...topics, v])
    setInput('')
  }, [topics, onChange])

  const removeTopic = (t) => onChange(topics.filter(x => x !== t))

  const handleKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addTopic(input) }
    if (e.key === 'Backspace' && !input && topics.length > 0) {
      removeTopic(topics[topics.length - 1])
    }
    if (e.key === ',') { e.preventDefault(); addTopic(input) }
  }

  const COLORS = [T.teal, T.blue, T.purple, T.orange, T.green, T.gold]

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl min-h-14 cursor-text"
      style={{ background: T.bgCard, border: `2px solid ${T.border}`, transition: 'border-color .2s' }}
      onClick={() => inputRef.current?.focus()}
      onFocus={() => {}} >
      {topics.map((t, i) => (
        <span key={t} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold"
          style={{
            background: COLORS[i % COLORS.length] + '18',
            color: COLORS[i % COLORS.length],
            border: `1px solid ${COLORS[i % COLORS.length]}35`,
          }}>
          {t}
          <button onClick={(e) => { e.stopPropagation(); removeTopic(t) }}
            className="hover:opacity-60 transition-opacity ml-0.5">
            <X size={11} />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => { if (input.trim()) addTopic(input) }}
        placeholder={topics.length === 0 ? 'Add topics — payments pipeline, BIC ETL, CGME… press Enter or comma' : 'Add another topic…'}
        className="flex-1 min-w-40 outline-none text-sm bg-transparent"
        style={{ color: T.textPri, caretColor: T.teal }}
      />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LearnPage() {
  const navigate = useNavigate()

  // Parse ?topics= from URL
  const _initTopics = () => {
    try {
      const raw = new URLSearchParams(window.location.search).get('topics') || ''
      return raw ? raw.split(',').map(t => decodeURIComponent(t.trim())).filter(Boolean) : []
    } catch(e) { return [] }
  }

  const [topics, setTopics]   = useState(_initTopics)
  const [results, setResults] = useState({}) // { [topic]: responseData | null (loading) }
  const [view, setView]       = useState('topic') // 'topic' | 'source'
  const [copied, setCopied]   = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)

  const generate = useCallback(async (topicList) => {
    if (!topicList.length) return
    setHasGenerated(true)
    // Set all topics to loading state
    setResults(Object.fromEntries(topicList.map(t => [t, null])))
    // Fetch all in parallel
    await Promise.all(topicList.map(async (t) => {
      try {
        const r = await getOnboardingPath(t)
        setResults(prev => ({ ...prev, [t]: r.data }))
      } catch(e) {
        setResults(prev => ({ ...prev, [t]: { sections: [], total: 0, error: true } }))
      }
    }))
    // Update URL without reload
    const encoded = topicList.map(t => encodeURIComponent(t)).join(',')
    window.history.replaceState({}, '', `/learn?topics=${encoded}`)
  }, [])

  // Auto-generate if topics came from URL
  useEffect(() => {
    const init = _initTopics()
    if (init.length > 0) generate(init)
  }, [])

  const copyLink = () => {
    const encoded = topics.map(t => encodeURIComponent(t)).join(',')
    const url = `${window.location.origin}/learn?topics=${encoded}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => prompt('Copy this link:', url))
  }

  // Merge all docs by source for source-view
  const docsBySource = () => {
    const map = {}
    Object.values(results).forEach(r => {
      if (!r?.sections) return
      r.sections.forEach(sec => {
        if (!map[sec.source_type]) map[sec.source_type] = []
        map[sec.source_type].push(...sec.docs)
      })
    })
    return map
  }

  const totalDocs = Object.values(results)
    .filter(Boolean)
    .reduce((s, r) => s + (r?.total || 0), 0)

  const allLoaded = topics.length > 0 && topics.every(t => results[t] !== null && results[t] !== undefined)
  const anyLoading = topics.some(t => results[t] === null)

  return (
    <div className="min-h-screen" style={{ background: T.bg, fontFamily: T.font }}>

      {/* ── Header bar ── */}
      <header className="sticky top-0 z-20 px-6 py-3 flex items-center justify-between"
        style={{ background: T.bgCard, borderBottom: `1px solid ${T.border}` }}>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/intelligence')}
            className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-60"
            style={{ color: T.textDim }}>
            <ArrowLeft size={14} />
            Back
          </button>
          <div style={{ width: 1, height: 18, background: T.border }} />
          {/* EKM Logo */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#0052cc,#0891b2)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="font-bold text-sm" style={{ color: T.textPri }}>Learning Path</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasGenerated && allLoaded && (
            <>
              {/* View toggle */}
              <div className="flex rounded-lg overflow-hidden"
                style={{ border: `1px solid ${T.border}` }}>
                {[['topic', <Layers size={13}/>, 'By Topic'], ['source', <FileText size={13}/>, 'By Source']].map(([v, icon, label]) => (
                  <button key={v} onClick={() => setView(v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all"
                    style={{
                      background: view === v ? T.blue : T.bgCard,
                      color: view === v ? '#fff' : T.textSec,
                    }}>
                    {icon}{label}
                  </button>
                ))}
              </div>
              <button onClick={copyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: copied ? T.green + '15' : T.teal + '15',
                  color: copied ? T.green : T.teal,
                  border: `1px solid ${copied ? T.green + '30' : T.teal + '30'}`,
                }}>
                {copied ? <Check size={13}/> : <Share2 size={13}/>}
                {copied ? 'Copied!' : 'Share Link'}
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── Main content ── */}
      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Hero title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: T.textPri }}>
            Build a Learning Path
          </h1>
          <p className="text-base" style={{ color: T.textSec }}>
            Add the systems, features, or topics you need to understand — get a curated reading list from all your knowledge sources.
          </p>
        </div>

        {/* Topic input + generate */}
        <div className="space-y-3 mb-10">
          <TopicInput topics={topics} onChange={setTopics} />
          <div className="flex items-center gap-3">
            <button
              onClick={() => generate(topics)}
              disabled={topics.length === 0 || anyLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background: topics.length === 0 ? T.border : `linear-gradient(135deg, ${T.blue}, ${T.teal})`,
                color: topics.length === 0 ? T.textDim : '#fff',
                cursor: topics.length === 0 ? 'not-allowed' : 'pointer',
                boxShadow: topics.length > 0 ? `0 4px 14px ${T.blue}35` : 'none',
              }}>
              {anyLoading
                ? <><RefreshCw size={14} className="animate-spin" /> Generating…</>
                : <><BookOpen size={14} /> Generate Path</>}
            </button>
            {topics.length > 0 && (
              <span className="text-sm" style={{ color: T.textDim }}>
                {topics.length} topic{topics.length > 1 ? 's' : ''}
                {hasGenerated && allLoaded && totalDocs > 0 && ` · ${totalDocs} documents found`}
              </span>
            )}
          </div>

          {/* Quick-add suggestions */}
          {topics.length === 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-xs" style={{ color: T.textDim }}>Try:</span>
              {['payments pipeline', 'BIC ETL', 'CGME dashboard', 'onboarding', 'scorecard'].map(s => (
                <button key={s} onClick={() => setTopics(prev => prev.includes(s) ? prev : [...prev, s])}
                  className="text-xs px-2.5 py-1 rounded-full transition-all hover:opacity-80"
                  style={{ background: T.bgMid, color: T.textSec, border: `1px solid ${T.border}` }}>
                  + {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Results ── */}
        {hasGenerated && (
          <div className="space-y-4">
            {view === 'topic' ? (
              // By-topic view
              topics.map((t, i) => (
                <TopicSection
                  key={t}
                  topic={t}
                  result={results[t] !== null && results[t] !== undefined ? results[t] : undefined}
                  defaultOpen={topics.length <= 3 || i === 0}
                />
              ))
            ) : (
              // By-source view
              Object.entries(docsBySource())
                .sort(([a], [b]) => {
                  const order = ['confluence', 'sharepoint', 'github', 'jira']
                  return order.indexOf(a) - order.indexOf(b)
                })
                .map(([src, docs]) => (
                  <SourceSection key={src} sourceType={src} docs={docs} />
                ))
            )}

            {/* Empty state */}
            {allLoaded && totalDocs === 0 && (
              <div className="text-center py-16 rounded-2xl"
                style={{ border: `2px dashed ${T.border}`, background: T.bgCard }}>
                <AlertCircle size={28} style={{ color: T.textDim, margin: '0 auto 12px' }} />
                <p className="font-semibold" style={{ color: T.textPri }}>No documents found</p>
                <p className="text-sm mt-1" style={{ color: T.textDim }}>
                  Try different keywords or sync your sources first
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
