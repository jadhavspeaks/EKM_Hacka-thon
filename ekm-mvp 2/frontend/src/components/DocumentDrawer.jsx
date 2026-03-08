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

import { useState, useEffect, useCallback } from 'react'
import { getDocument } from '../api'
import { SourceBadge, Spinner, TeamsButton } from './UI'
import {
  X, ExternalLink, Clock, Tag, User, Hash, AlertCircle,
  FileText, GitBranch, GitCommit, ChevronRight, Copy, Check,
  BookOpen, Layers, Calendar, Activity
} from 'lucide-react'

// ── Metadata pill ─────────────────────────────────────────────────────────────
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

// ── Status colour helper ──────────────────────────────────────────────────────
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

// ── Jira-specific layout ──────────────────────────────────────────────────────
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
          <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-lg p-3 border border-slate-200 max-h-64 overflow-y-auto">
            {doc.content}
          </div>
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
            <a href={doc.url} target="_blank" rel="noreferrer"
              className="ml-auto text-xs text-teal-600 hover:underline flex items-center gap-1">
              View in Jira <ExternalLink size={10}/>
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// ── Confluence-specific layout ────────────────────────────────────────────────
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
          <div className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-4 border border-slate-200 max-h-96 overflow-y-auto whitespace-pre-wrap">
            {doc.content}
          </div>
        </div>
      )}
    </div>
  )
}

// ── GitHub-specific layout ────────────────────────────────────────────────────
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
          <pre className="text-xs text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-200 max-h-80 overflow-y-auto font-mono leading-relaxed whitespace-pre-wrap">
            {doc.content}
          </pre>
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

// ── Generic fallback layout ───────────────────────────────────────────────────
function GenericLayout({ doc }) {
  return (
    <div className="space-y-4">
      {doc.content && (
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-medium">Content</p>
          <div className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-4 border border-slate-200 max-h-96 overflow-y-auto whitespace-pre-wrap">
            {doc.content}
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DRAWER
// ═══════════════════════════════════════════════════════════════════════════════
export default function DocumentDrawer({ docId, onClose }) {
  const [doc, setDoc]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

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
      navigator.clipboard.writeText(doc.url)
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
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
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
              <a href={doc.url} target="_blank" rel="noreferrer"
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
