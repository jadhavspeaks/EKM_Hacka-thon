/**
 * DocumentDrawer
 * Slide-in panel from the right showing full document content.
 * Used by Search.jsx and Documents.jsx.
 *
 * Usage:
 *   <DocumentDrawer docId={id} onClose={() => setDocId(null)} />
 *
 * Pass docId=null to close.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { T } from '../theme'
import { getDocument, flagDocument, getFlags, addAnnotation, getAnnotations, voteAnnotation } from '../api'
import { SourceBadge, Spinner, TeamsButton } from './UI'
import {
  X, ExternalLink, Clock, Tag, User, Hash, AlertCircle,
  FileText, GitBranch, GitCommit, ChevronRight, Copy, Check,
  BookOpen, Layers, Calendar, Activity, Flag, MessageSquare,
  ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, Send, AlertTriangle,
  Lightbulb, Pencil, Users
} from 'lucide-react'

// Resolve the best deep-link URL for a document.
// Falls back to building from external_id when stored url is just a base URL.
function resolveUrl(doc, cfg) {
  const stored = doc?.url || ""
  // If stored URL has a real path (not just host), trust it
  try {
    const u = new URL(stored)
    if (u.pathname && u.pathname.length > 1) return stored
  } catch(e) { /* ignore */ }

  // Build from external_id + metadata
  const id  = doc?.external_id || ""
  const src = doc?.source_type || ""
  const m   = doc?.metadata    || {}

  if (src === "jira" && id && cfg?.jira_url) {
    return `${cfg.jira_url}/browse/${id}`
  }
  if (src === "confluence" && id && cfg?.confluence_url) {
    return `${cfg.confluence_url}/pages/viewpage.action?pageId=${id}`
  }
  if (src === "github") {
    const host   = cfg?.github_host || "github.com"
    const repo   = m.repo_full_name || m.repo || ""
    const ct     = m.content_type   || ""
    if (ct === "commit"       && m.sha)         return `https://${host}/${repo}/commit/${m.sha}`
    if (ct === "pull_request" && m.pr_number)   return `https://${host}/${repo}/pull/${m.pr_number}`
    if (ct === "file"         && m.file_path)   return `https://${host}/${repo}/blob/${m.branch || "main"}/${m.file_path}`
    if (repo) return `https://${host}/${repo}`
  }
  if (src === "sharepoint" && stored) return stored
  return stored
}

// Prism.js for syntax highlighting - loaded from CDN
let _prismLoaded = false
function ensurePrism(cb) {
  if (typeof window === 'undefined') return
  if (window.Prism) { cb(); return }
  if (_prismLoaded) { setTimeout(() => cb(), 300); return }
  _prismLoaded = true
  const css = document.createElement('link')
  css.rel = 'stylesheet'
  css.href = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css'
  document.head.appendChild(css)
  const s = document.createElement('script')
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js'
  s.onload = () => {
    const s2 = document.createElement('script')
    s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js'
    s2.onload = cb
    document.head.appendChild(s2)
  }
  document.head.appendChild(s)
}

// Detect language from file path or content
function detectLang(filePath, content) {
  if (!filePath && !content) return null
  const ext = (filePath || '').split('.').pop().toLowerCase()
  const map = {
    js:'javascript', jsx:'javascript', ts:'typescript', tsx:'typescript',
    py:'python', java:'java', go:'go', rb:'ruby', rs:'rust',
    cs:'csharp', cpp:'cpp', c:'c', sh:'bash', yml:'yaml', yaml:'yaml',
    json:'json', xml:'xml', html:'html', css:'css', sql:'sql',
    md:'markdown', tf:'hcl', kt:'kotlin', scala:'scala',
  }
  if (map[ext]) return map[ext]
  if (content) {
    if (content.includes('def ') && content.includes(':')) return 'python'
    if (content.includes('func ') && content.includes('package ')) return 'go'
    if (content.includes('import React') || content.includes('const ')) return 'javascript'
    if (content.includes('public class') || content.includes('import java')) return 'java'
  }
  return null
}

// Syntax-highlighted code block
function CodeBlock({ content, filePath }) {
  const ref = useRef(null)
  const lang = detectLang(filePath, content)
  useEffect(() => {
    if (!ref.current) return
    ensurePrism(() => {
      if (window.Prism) window.Prism.highlightElement(ref.current)
    })
  }, [content, lang])
  return (
    <pre className="rounded-lg overflow-auto max-h-96 text-xs leading-relaxed"
      style={{ background: '#2d2d2d', padding: '14px', margin: 0, border: 'none' }}>
      <code ref={ref} className={lang ? `language-${lang}` : ''} style={{ fontFamily: 'JetBrains Mono, Fira Code, monospace', fontSize: '11.5px' }}>
        {content}
      </code>
    </pre>
  )
}

// -- Metadata pill -------------------------------------------------------------
function Pill({ label, value, color }) {
  if (!value) return null
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">{label}</span>
      <span className={`text-xs font-semibold px-2 py-1 rounded-md ${color || 'bg-slate-100 text-slate-700'}`}>
        {value}
      </span>
    </div>
  )
}

// -- Status colour helper ------------------------------------------------------
function statusColors(status = '') {
  const s = status.toLowerCase()
  if (['done','closed','resolved','complete','completed'].some(x => s.includes(x)))
    return 'bg-green-50 text-green-700 border border-green-200'
  if (['in progress','open','active'].some(x => s.includes(x)))
    return 'bg-blue-50 text-blue-700 border border-blue-200'
  if (['blocked','critical','rejected'].some(x => s.includes(x)))
    return 'bg-red-50 text-red-700 border border-red-200'
  if (['review','testing'].some(x => s.includes(x)))
    return 'bg-amber-50 text-amber-700 border border-amber-200'
  return 'bg-slate-100 text-slate-600'
}

function priorityColors(priority = '') {
  const p = priority.toLowerCase()
  if (p === 'critical' || p === 'blocker') return 'bg-red-50 text-red-700 border border-red-200'
  if (p === 'high') return 'bg-orange-50 text-orange-700 border border-orange-100'
  if (p === 'medium') return 'bg-amber-50 text-amber-700 border border-amber-100'
  return 'bg-slate-100 text-slate-600'
}

// -- Jira-specific layout ------------------------------------------------------
function JiraLayout({ doc }) {
  const m = doc.metadata || {}
  return (
    <div className="space-y-5">
      {/* Status + Priority + Assignee row */}
      <div className="grid grid-cols-3 gap-3">
        {m.status && (
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Status</p>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors(m.status)}`}>
              {m.status}
            </span>
          </div>
        )}
        {m.priority && (
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Priority</p>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${priorityColors(m.priority)}`}>
              {m.priority}
            </span>
          </div>
        )}
        {m.assignee && (
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Assignee</p>
            <span className="text-xs font-medium text-slate-700">{m.assignee}</span>
          </div>
        )}
      </div>

      {/* Reporter + Resolution */}
      {(m.reporter || m.resolution) && (
        <div className="grid grid-cols-2 gap-3">
          {m.reporter && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Reporter</p>
              <span className="text-xs text-slate-600">{m.reporter}</span>
            </div>
          )}
          {m.resolution && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Resolution</p>
              <span className="text-xs text-slate-600">{m.resolution}</span>
            </div>
          )}
        </div>
      )}

      {/* Description */}
      {doc.content && (
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-medium">Description</p>
          <SmartContent content={doc.content} maxHeight="max-h-64" />
        </div>
      )}

      {/* Components + Labels */}
      {(m.components?.length > 0 || m.labels?.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {m.components?.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1.5">Components</p>
              <div className="flex flex-wrap gap-1">
                {m.components.map(c => (
                  <span key={c} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{c}</span>
                ))}
              </div>
            </div>
          )}
          {m.labels?.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1.5">Labels</p>
              <div className="flex flex-wrap gap-1">
                {m.labels.map(l => (
                  <span key={l} className="text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full">{l}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Comment count */}
      {m.comment_count > 0 && (
        <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
          <Activity size={13}/>
          <span>{m.comment_count} comment{m.comment_count !== 1 ? 's' : ''} on this issue</span>
          {doc.url && (
            <a href={resolveUrl(doc, cfg)} target="_blank" rel="noreferrer"
              className="ml-auto text-xs text-teal-600 hover:underline flex items-center gap-1">
              View in Jira <ExternalLink size={10}/>
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// -- Confluence-specific layout ------------------------------------------------
function ConfluenceLayout({ doc }) {
  const m = doc.metadata || {}
  return (
    <div className="space-y-5">
      {/* Breadcrumb ancestors */}
      {m.ancestors?.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          <BookOpen size={12} className="text-violet-400 shrink-0"/>
          {m.ancestors.map((a, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="text-xs text-slate-400">{a}</span>
              {i < m.ancestors.length - 1 && <ChevronRight size={10} className="text-slate-300"/>}
            </span>
          ))}
          <ChevronRight size={10} className="text-slate-300"/>
          <span className="text-xs font-semibold text-violet-600">{doc.title}</span>
        </div>
      )}

      {/* Space + Version */}
      <div className="grid grid-cols-3 gap-3">
        {m.space_key && (
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Space</p>
            <span className="text-xs font-mono font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-1 rounded">
              {m.space_key}
            </span>
          </div>
        )}
        {m.version && (
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Version</p>
            <span className="text-xs text-slate-600">v{m.version}</span>
          </div>
        )}
        {m.status && (
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Status</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors(m.status)}`}>
              {m.status}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      {doc.content && (
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-medium">Content</p>
          <SmartContent content={doc.content} filePath={doc.title} maxHeight="max-h-96" />
        </div>
      )}
    </div>
  )
}

// -- GitHub-specific layout ----------------------------------------------------
function GitHubLayout({ doc }) {
  const m = doc.metadata || {}
  const ct = m.content_type || 'commit'
  const Icon = ct === 'pull_request' ? GitBranch : ct === 'commit' ? GitCommit : FileText

  return (
    <div className="space-y-5">
      {/* Type + author */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Type</p>
          <div className="flex items-center gap-1.5">
            <Icon size={12} className="text-slate-500"/>
            <span className="text-xs font-mono font-semibold text-slate-700 capitalize">{ct.replace('_',' ')}</span>
          </div>
        </div>
        {m.author_name && (
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Author</p>
            <span className="text-xs text-slate-600">{m.author_name}</span>
          </div>
        )}
        {m.sha && (
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">SHA</p>
            <span className="text-xs font-mono text-slate-500">{m.sha?.slice(0, 8)}</span>
          </div>
        )}
      </div>

      {/* PR state */}
      {m.state && (
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">State</p>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            m.state === 'merged' ? 'bg-violet-50 text-violet-700 border border-violet-200' :
            m.state === 'open'   ? 'bg-green-50 text-green-700 border border-green-200'   :
                                   'bg-slate-100 text-slate-600'
          }`}>{m.state}</span>
        </div>
      )}

      {/* Branch info */}
      {(m.head_branch || m.base_branch) && (
        <div className="flex items-center gap-2 bg-slate-800 text-slate-300 rounded-lg px-3 py-2 text-xs font-mono">
          <GitBranch size={12}/>
          <span>{m.head_branch}</span>
          {m.base_branch && <><span className="text-slate-500">→</span><span>{m.base_branch}</span></>}
        </div>
      )}

      {/* Commit message / content */}
      {doc.content && (
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-medium">
            {ct === 'commit' ? 'Commit Message' : ct === 'pull_request' ? 'Description' : 'Content'}
          </p>
          <CodeBlock content={doc.content} filePath={m.file_path} />
        </div>
      )}

      {/* File path for code files */}
      {m.file_path && (
        <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
          <FileText size={12} className="text-slate-400 shrink-0"/>
          <span className="text-xs font-mono text-slate-600">{m.file_path}</span>
        </div>
      )}
    </div>
  )
}

// -- Generic fallback layout ---------------------------------------------------
function GenericLayout({ doc }) {
  return (
    <div className="space-y-4">
      {doc.content && (
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-medium">Content</p>
          <SmartContent content={doc.content} filePath={doc.title} maxHeight="max-h-96" />
        </div>
      )}
    </div>
  )
}


// Smart content renderer - uses CodeBlock if content looks like code, else prose
function SmartContent({ content, filePath, maxHeight = 'max-h-96' }) {
  if (!content) return null
  const lang = detectLang(filePath, content)
  const looksLikeCode = lang !== null ||
    /^(import |from |def |class |function |const |var |let |public |private |SELECT |CREATE |package )/.test(content.trim()) ||
    (content.includes('
') && (content.match(/^\s{2,}/m) || content.match(/[{}();]/g)?.length > 5))

  if (looksLikeCode) {
    return <CodeBlock content={content} filePath={filePath} />
  }
  return (
    <div className={`text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-4 border border-slate-200 ${maxHeight} overflow-y-auto whitespace-pre-wrap`}>
      {content}
    </div>
  )
}

// ===============================================================================
// COMMUNITY PANEL
// ===============================================================================
const FLAG_TYPES = [
  { key: 'outdated',     label: 'Outdated',     color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { key: 'incorrect',    label: 'Incorrect',    color: 'text-red-600 bg-red-50 border-red-200' },
  { key: 'useful',       label: 'Mark useful',  color: 'text-green-600 bg-green-50 border-green-200' },
  { key: 'needs_review', label: 'Needs review', color: 'text-blue-600 bg-blue-50 border-blue-200' },
]

const ANN_TYPES = [
  { key: 'note',       label: 'Note',       color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { key: 'suggestion', label: 'Suggestion', color: 'bg-purple-50 border-purple-200 text-purple-700' },
  { key: 'correction', label: 'Correction', color: 'bg-amber-50 border-amber-200 text-amber-700' },
]

function CommunityPanel({ docId }) {
  const [open, setOpen]               = useState(true)
  const [tab, setTab]                 = useState('flags')
  const [flags, setFlags]             = useState([])
  const [annotations, setAnnotations] = useState([])
  const [author, setAuthor]           = useState('')
  const [noteText, setNoteText]       = useState('')
  const [noteType, setNoteType]       = useState('note')
  const [submitting, setSubmitting]   = useState(false)
  const [done, setDone]               = useState('')

  useEffect(() => {
    if (!open || !docId) return
    getFlags(docId).then(r => setFlags(r.data.flags || [])).catch(() => {})
    getAnnotations(docId).then(r => setAnnotations(r.data.annotations || [])).catch(() => {})
  }, [open, docId])

  const submitFlag = async (flagType) => {
    setSubmitting(true)
    try {
      await flagDocument({ doc_id: docId, flag_type: flagType, author: author || 'anonymous' })
      setFlags(prev => [...prev, { flag_type: flagType, author: author || 'anonymous', created_at: new Date().toISOString() }])
      setDone('Flag submitted')
      setTimeout(() => setDone(''), 2000)
    } catch(e) { } finally { setSubmitting(false) }
  }

  const submitNote = async () => {
    if (!noteText.trim()) return
    setSubmitting(true)
    try {
      const r = await addAnnotation({ doc_id: docId, text: noteText, author: author || 'anonymous', annotation_type: noteType })
      setAnnotations(prev => [{ id: r.data.id, text: noteText, author: author || 'anonymous', annotation_type: noteType, votes: 0, created_at: new Date().toISOString() }, ...prev])
      setNoteText('')
      setDone('Note added')
      setTimeout(() => setDone(''), 2000)
    } catch(e) { } finally { setSubmitting(false) }
  }

  const vote = async (id, dir) => {
    await voteAnnotation({ annotation_id: id, direction: dir }).catch(() => {})
    setAnnotations(prev => prev.map(a => a.id === id ? { ...a, votes: a.votes + (dir === 'up' ? 1 : -1) } : a))
  }

  const flagCounts = flags.reduce((acc, f) => { acc[f.flag_type] = (acc[f.flag_type] || 0) + 1; return acc }, {})
  const total = flags.length + annotations.length

  return (
    <div className="border-t-2 border-teal-100">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3 bg-teal-50 hover:bg-teal-100 transition-colors">
        <span className="flex items-center gap-2 text-sm text-teal-700 font-semibold">
          <Users size={14} className="text-teal-600"/>
          Community Contributions
          {total > 0 && <span className="bg-teal-600 text-white px-2 py-0.5 rounded-full text-xs font-bold">{total}</span>}
          {total === 0 && <span className="text-xs text-teal-400 font-normal">— flag, annotate, vote</span>}
        </span>
        {open ? <ChevronUp size={14} className="text-teal-500"/> : <ChevronDown size={14} className="text-teal-500"/>}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-3 bg-white">

          {/* ── Your name ── */}
          <input value={author} onChange={e => setAuthor(e.target.value)}
            placeholder="Your name (optional)"
            className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:border-teal-400 bg-slate-50"/>

          {done && <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3 font-medium">{done}</div>}

          {/* ── Flag buttons — always visible ── */}
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Flag this document</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {FLAG_TYPES.map(ft => (
              <button key={ft.key} onClick={() => submitFlag(ft.key)} disabled={submitting}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs font-semibold transition-all hover:shadow-sm active:scale-95 disabled:opacity-50 ${ft.color}`}>
                <span>{ft.label}</span>
                {flagCounts[ft.key] > 0 && (
                  <span className="ml-2 bg-white bg-opacity-60 rounded-full px-1.5 py-0.5 font-bold text-xs">{flagCounts[ft.key]}</span>
                )}
              </button>
            ))}
          </div>

          {/* Recent flags */}
          {flags.length > 0 && (
            <div className="mb-4 space-y-1">
              {flags.slice(0,3).map((f,i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-400 py-0.5">
                  <Flag size={9} className="text-slate-300"/>
                  <span className="font-medium capitalize text-slate-500">{f.flag_type.replace('_',' ')}</span>
                  <span>·</span>
                  <span>{f.author}</span>
                  <span className="ml-auto">{new Date(f.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Divider ── */}
          <div className="border-t border-slate-100 mb-3"/>

          {/* ── Notes ── */}
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Add a note
            {annotations.length > 0 && <span className="ml-1.5 bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full normal-case">{annotations.length}</span>}
          </p>
          <div className="flex gap-1 mb-2">
            {ANN_TYPES.map(at => (
              <button key={at.key} onClick={() => setNoteType(at.key)}
                className={`px-2.5 py-1 rounded-md text-xs border font-medium transition-all ${noteType===at.key ? at.color : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                {at.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mb-3">
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
              placeholder="Add context, correction or suggestion visible to everyone..."
              rows={2}
              className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-teal-400 resize-none bg-slate-50"/>
            <button onClick={submitNote} disabled={submitting || !noteText.trim()}
              className="self-end p-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-40 transition-colors">
              <Send size={12}/>
            </button>
          </div>

          {/* Existing notes */}
          {annotations.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-1">No notes yet — be the first to add context.</p>
          )}
          {annotations.map(a => (
            <div key={a.id} className="bg-slate-50 rounded-lg p-3 border border-slate-100 mb-2">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${(ANN_TYPES.find(t => t.key===a.annotation_type)||ANN_TYPES[0]).color}`}>
                  {(ANN_TYPES.find(t => t.key===a.annotation_type)||ANN_TYPES[0]).label}
                </span>
                <span className="text-xs font-medium text-slate-600">{a.author}</span>
                <span className="ml-auto text-xs text-slate-400">{new Date(a.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed mb-1.5">{a.text}</p>
              <div className="flex items-center gap-3">
                <button onClick={() => vote(a.id,'up')} className="flex items-center gap-1 text-xs text-slate-400 hover:text-green-600 transition-colors">
                  <ThumbsUp size={10}/>{a.votes > 0 ? <span className="ml-0.5">{a.votes}</span> : null}
                </button>
                <button onClick={() => vote(a.id,'down')} className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors">
                  <ThumbsDown size={10}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


// ===============================================================================
// MAIN DRAWER
// ===============================================================================
export default function DocumentDrawer({ docId, onClose }) {
  const [doc, setDoc]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    getConfig().then(r => setCfg(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!docId) { setDoc(null); return }
    setLoading(true)
    setDoc(null)
    getDocument(docId)
      .then(r => setDoc(r.data))
      .catch(() => setDoc(null))
      .finally(() => setLoading(false))
  }, [docId])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const copyUrl = () => {
    if (doc?.url) {
      navigator.clipboard.writeText(resolveUrl(doc, cfg))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  if (!docId) return null

  const SRC_ACCENT = {
    confluence: { bg: '#f5f3ff', border: '#ddd6fe', text: '#7c3aed' },
    jira:       { bg: '#fff7ed', border: '#fed7aa', text: '#ea580c' },
    github:     { bg: '#f8fafc', border: '#e2e8f0', text: '#334155' },
    sharepoint: { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb' },
  }
  const accent = doc ? (SRC_ACCENT[doc.source_type] || SRC_ACCENT.sharepoint) : SRC_ACCENT.confluence

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 backdrop-blur-sm z-40 transition-opacity" style={{background:"rgba(15,23,42,0.3)"}}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col overflow-hidden"
        style={{ borderLeft: '1px solid #e2e8f0' }}>

        {/* ── Header ── */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-slate-100"
          style={{ background: loading ? '#f8fafc' : accent.bg, borderBottomColor: accent.border }}>
          {doc && <div className="mt-0.5 shrink-0"><SourceBadge type={doc.source_type}/></div>}
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-slate-900 leading-tight line-clamp-2">
              {loading ? 'Loading…' : (doc?.title || 'Document')}
            </h2>
            {doc && (
              <p className="text-xs mt-0.5" style={{ color: accent.text }}>
                {doc.source}
                {doc.author && <span className="text-slate-400"> · {doc.author}</span>}
              </p>
            )}
          </div>
          <button onClick={onClose}
            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white transition-all">
            <X size={15}/>
          </button>
        </div>

        {/* ── Action bar ── */}
        {doc && (
          <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 border-b border-slate-100">
            {doc.url && (
              <a href={resolveUrl(doc, cfg)} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-lg hover:bg-teal-100 transition-colors">
                <ExternalLink size={11}/> Open in {doc.source_type === 'jira' ? 'Jira' : doc.source_type === 'confluence' ? 'Confluence' : doc.source_type === 'github' ? 'GitHub' : 'Source'}
              </a>
            )}
            {doc.url && (
              <button onClick={copyUrl}
                className="flex items-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                {copied ? <><Check size={11} className="text-green-500"/> Copied!</> : <><Copy size={11}/> Copy URL</>}
              </button>
            )}
            {doc.author && (
              <div className="ml-auto">
                <TeamsButton name={doc.author} domain="citi.com"/>
              </div>
            )}
          </div>
        )}

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <Spinner/>
              <p className="text-xs text-slate-400">Loading document…</p>
            </div>
          )}

          {!loading && !doc && (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <AlertCircle size={24} className="text-slate-300"/>
              <p className="text-sm text-slate-400">Could not load document</p>
            </div>
          )}

          {doc && !loading && (
            <div className="space-y-5">
              {/* Dates row */}
              <div className="flex items-center gap-4 text-xs text-slate-400">
                {doc.updated_at && (
                  <span className="flex items-center gap-1">
                    <Clock size={11}/>
                    Updated {new Date(doc.updated_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}
                  </span>
                )}
                {doc.ingested_at && (
                  <span className="flex items-center gap-1">
                    <Calendar size={11}/>
                    Indexed {new Date(doc.ingested_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}
                  </span>
                )}
              </div>

              {/* Source-specific body */}
              {doc.source_type === 'jira'       && <JiraLayout       doc={doc}/>}
              {doc.source_type === 'confluence'  && <ConfluenceLayout doc={doc}/>}
              {doc.source_type === 'github'      && <GitHubLayout     doc={doc}/>}
              {(doc.source_type === 'sharepoint' || !['jira','confluence','github'].includes(doc.source_type))
                && <GenericLayout doc={doc}/>}

              {/* Extracted entities */}
              {doc.entities && Object.keys(doc.entities).length > 0 && (
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-medium flex items-center gap-1.5">
                    <Hash size={11}/> Extracted Entities
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(doc.entities).flatMap(([type, vals]) =>
                      (Array.isArray(vals) ? vals : [vals]).map(v => (
                        <span key={`${type}-${v}`}
                          className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-mono">
                          {v}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Tags */}
              {doc.tags?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-medium flex items-center gap-1.5">
                    <Tag size={11}/> Tags
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {doc.tags.map(t => (
                      <span key={t} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ── Community Panel ── visible below scroll, above footer */}
        {doc && !loading && <CommunityPanel docId={doc.id} />}

        {/* ── Footer ── */}
        {doc && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">{doc.external_id}</span>
            <span className="text-xs text-slate-300">{doc.id?.slice(-8)}</span>
          </div>
        )}
      </div>
    </>
  )
}
