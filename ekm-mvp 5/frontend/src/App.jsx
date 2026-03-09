import { Routes, Route, NavLink } from 'react-router-dom'
import { LayoutDashboard, Search, FileText, Lightbulb } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import SearchPage from './pages/Search'
import Documents from './pages/Documents'
import Intelligence from './pages/Intelligence'
import LearnPage from './pages/LearnPage'

// ── Theme (inline) ───────────────────────────────────────────────────────
const _tid = (() => { try { return localStorage.getItem('ekm-theme')||'arctic' } catch(e) { return 'arctic' } })()
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
function toggleTheme() {
  try { localStorage.setItem('ekm-theme', _tid==='slate'?'arctic':'slate') } catch(e) {}
  window.location.reload()
}
// ─────────────────────────────────────────────────────────────────────────────


const NAV = [
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/search',       icon: Search,          label: 'Search'       },
  { to: '/documents',    icon: FileText,        label: 'Documents'    },
  { to: '/intelligence', icon: Lightbulb,       label: 'Intelligence' },
]

export default function App() {
  // Standalone pages (no sidebar)
  if (window.location.pathname === '/learn') {
    return <Routes><Route path="/learn" element={<LearnPage />} /></Routes>
  }

  return (
    <div className="flex h-screen overflow-hidden"
      style={{ background: T.bg, fontFamily: T.font }}>

      {/* ── Sidebar ── */}
      <aside className="w-52 flex flex-col shrink-0"
        style={{ background: T.navBg, borderRight: `1px solid ${T.navBorder}` }}>

        {/* Logo */}
        <div className="px-4 py-4" style={{ borderBottom: `1px solid ${T.navBorder}` }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#0052cc,#0891b2)' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white"
                strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <p className="font-bold text-sm leading-tight"
                style={{ color: T.id === 'slate' ? '#e8edf2' : T.textPri }}>EKM</p>
              <p className="text-xs" style={{ color: T.navText }}>Knowledge Hub</p>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={({ isActive }) => ({
                background: isActive ? T.navActiveBg  : 'transparent',
                color:      isActive ? T.navActive     : T.navText,
                border:     isActive ? `1px solid ${T.navActiveBorder}` : '1px solid transparent',
              })}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer with theme toggle */}
        <div className="px-3 py-3" style={{ borderTop: `1px solid ${T.navBorder}` }}>
          <div className="flex items-center gap-2 mb-2.5">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#0052cc' }} />
            <span className="text-xs" style={{ color: T.navText }}>MVP v3.8</span>
          </div>
          <button onClick={toggleTheme} style={{
            display:'inline-flex',alignItems:'center',gap:6,padding:'5px 10px',
            borderRadius:8,cursor:'pointer',background:T.bgCard,
            border:`1px solid ${T.border}`,fontSize:12,fontWeight:600,
            fontFamily:T.font,color:T.textSec,width:'100%',justifyContent:'center'
          }}>
            <span>{_tid==='arctic'?'🌙':'☀️'}</span>
            {_tid==='arctic'?'Slate':'Arctic'}
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        <Routes>
          <Route path="/"             element={<Dashboard />}    />
          <Route path="/search"       element={<SearchPage />}   />
          <Route path="/documents"    element={<Documents />}    />
          <Route path="/intelligence" element={<Intelligence />} />
          <Route path="/learn"        element={<LearnPage />}    />
        </Routes>
      </main>
    </div>
  )
}
