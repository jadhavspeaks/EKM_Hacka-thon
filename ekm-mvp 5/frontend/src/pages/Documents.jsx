import { useState, useEffect } from 'react'
import { listDocuments } from '../api'
import { SourceBadge, EmptyState, Spinner } from '../components/UI'
import { ExternalLink, FileText, Clock, Tag, ChevronLeft, ChevronRight, Filter, Eye } from 'lucide-react'
import DocumentDrawer from '../components/DocumentDrawer'
// ── Theme (inline) ───────────────────────────────────────────────────────
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


const SOURCES = ['', 'confluence', 'jira', 'github', 'sharepoint']
const SOURCE_LABELS = { '': 'All', sharepoint: 'SharePoint', confluence: 'Confluence', jira: 'Jira', github: 'GitHub' }
const SOURCE_COUNTS_COLOR = {
  confluence: 'bg-violet-50 text-violet-700 border-violet-200',
  jira:       'bg-orange-50 text-orange-700 border-orange-200',
  github:     'bg-slate-100 text-slate-700 border-slate-200',
  sharepoint: 'bg-blue-50 text-blue-700 border-blue-200',
  '':         'bg-teal-50 text-teal-700 border-teal-200',
}

function DocRow({ doc, onClick }) {
  const m = doc.metadata || {}
  const isJira = doc.source_type === 'jira'
  const isGH   = doc.source_type === 'github'
  const ct     = m.content_type || ''

  return (
    <tr
      className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group"
      onClick={() => doc.url && window.open(doc.url, '_blank')}
    >
      <td className="py-3 px-4 w-6">
        <SourceBadge type={doc.source_type}/>
      </td>
      <td className="py-3 px-2">
        <div className="font-medium text-slate-800 text-sm group-hover:text-teal-700 transition-colors line-clamp-1 max-w-xs">
          {doc.title}
        </div>
        {doc.content_preview && (
          <div className="text-xs text-slate-400 line-clamp-1 mt-0.5 max-w-xs">
            {doc.content_preview}
          </div>
        )}
      </td>
      <td className="py-3 px-2 hidden md:table-cell">
        <span className="text-xs text-slate-500">{doc.source}</span>
      </td>
      <td className="py-3 px-2 hidden lg:table-cell">
        <span className="text-xs text-slate-500 truncate block max-w-[120px]">
          {doc.author || m.assignee || '—'}
        </span>
      </td>
      <td className="py-3 px-2 hidden lg:table-cell">
        <div className="flex flex-wrap gap-1">
          {m.status && (
            <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">{m.status}</span>
          )}
          {isGH && ct && (
            <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">{ct}</span>
          )}
          {m.priority && (
            <span className="text-xs bg-orange-50 text-orange-600 border border-orange-100 px-1.5 py-0.5 rounded-full">{m.priority}</span>
          )}
        </div>
      </td>
      <td className="py-3 px-2 hidden xl:table-cell">
        <span className="text-xs text-slate-400 flex items-center gap-1">
          <Clock size={10}/>
          {doc.updated_at
            ? new Date(doc.updated_at).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'2-digit'})
            : '—'
          }
        </span>
      </td>
      <td className="py-3 px-4 text-right">
        {doc.url && (
          <a href={doc.url} target="_blank" rel="noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-xs text-teal-600 hover:text-teal-800 flex items-center gap-1 justify-end font-medium">
            <ExternalLink size={11}/> Open
          </a>
        )}
      </td>
    </tr>
  )
}

export default function Documents() {
  const [docs, setDocs]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [sourceFilter, setFilter]   = useState('')
  const [page, setPage]             = useState(1)
  const [drawerDocId, setDrawerDocId] = useState(null)

  const load = async (src = sourceFilter, p = 1) => {
    setLoading(true)
    try {
      const res = await listDocuments(src, p)
      setDocs(res.data)
      setPage(p)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleFilter = src => { setFilter(src); load(src, 1) }

  const totalPages = docs ? Math.ceil(docs.total / docs.page_size) : 1

  return (
    <>
    <div className="min-h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 mb-0.5">Document Browser</h1>
            <p className="text-sm text-slate-500">Browse all indexed documents across sources</p>
          </div>
          {docs && (
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-800" style={{fontFamily:"'IBM Plex Mono',monospace"}}>
                {docs.total.toLocaleString()}
              </div>
              <div className="text-xs" style={{color:"#64748b"}}>total documents</div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-5 space-y-4">
        {/* Source filter tabs */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Filter size={13}/> Filter:
          </div>
          {SOURCES.map(src => (
            <button key={src}
              onClick={() => handleFilter(src)}
              className={`text-sm px-4 py-1.5 rounded-full border font-medium transition-colors ${
                sourceFilter === src
                  ? SOURCE_COUNTS_COLOR[src] + ' border-current'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}>
              {SOURCE_LABELS[src]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner/></div>
        ) : docs?.results?.length > 0 ? (
          <>
            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  Showing {((page-1)*docs.page_size)+1}–{Math.min(page*docs.page_size, docs.total)} of{' '}
                  <strong className="text-slate-700">{docs.total.toLocaleString()}</strong>
                  {sourceFilter && ` · ${SOURCE_LABELS[sourceFilter]}`}
                </span>
              </div>

              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="py-2.5 px-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Source</th>
                    <th className="py-2.5 px-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Title</th>
                    <th className="py-2.5 px-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Space / Repo</th>
                    <th className="py-2.5 px-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Author</th>
                    <th className="py-2.5 px-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Status</th>
                    <th className="py-2.5 px-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden xl:table-cell">Updated</th>
                    <th className="py-2.5 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {docs.results.map(doc => <DocRow key={doc.id} doc={doc} onPreview={setDrawerDocId}/>)}
                </tbody>
              </table>

              {/* Pagination */}
              {docs.total > docs.page_size && (
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs" style={{color:"#64748b"}}>Page {page} of {totalPages}</span>
                  <div className="flex gap-2">
                    <button
                      className="flex items-center gap-1 text-xs px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 transition-colors"
                      disabled={page === 1} onClick={() => load(sourceFilter, page-1)}>
                      <ChevronLeft size={12}/> Previous
                    </button>
                    <button
                      className="flex items-center gap-1 text-xs px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 transition-colors"
                      disabled={page >= totalPages} onClick={() => load(sourceFilter, page+1)}>
                      Next <ChevronRight size={12}/>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <EmptyState icon="📄" title="No documents yet"
            subtitle="Run a sync from the Dashboard to start indexing documents."/>
        )}
      </div>
    </div>

    {/* Document Preview Drawer */}
    <DocumentDrawer docId={drawerDocId} onClose={() => setDrawerDocId(null)} />
    </>
  )
}
