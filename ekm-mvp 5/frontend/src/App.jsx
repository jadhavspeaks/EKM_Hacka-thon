import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Search, FileText, Lightbulb } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import SearchPage from './pages/Search'
import Documents from './pages/Documents'
import Intelligence from './pages/Intelligence'
import NewJoiner from './pages/NewJoiner'
import GlobalSearch from './components/GlobalSearch'

// ── Arctic theme tokens — Option A: white sidebar, IBM Blue accent ───────────
const NAV_BG      = '#ffffff'   // white sidebar
const NAV_BORDER  = '#e8edf4'   // cool gray border
const NAV_TEXT    = '#4a5568'   // slate-600
const NAV_ACTIVE  = '#0052cc'   // IBM Blue text when active
const NAV_ACCENT  = '#0052cc'   // IBM Blue
const LOGO_BG     = 'linear-gradient(135deg,#0052cc,#0891b2)'

const NAV = [
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/search',       icon: Search,          label: 'Search'       },
  { to: '/documents',    icon: FileText,        label: 'Documents'    },
  { to: '/intelligence', icon: Lightbulb,       label: 'Intelligence' },
]

function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden" style={{background:'#f4f6f9',fontFamily:"'IBM Plex Sans',sans-serif"}}>

      {/* ── Sidebar ── */}
      <aside className="w-56 flex flex-col shrink-0"
        style={{background: NAV_BG, borderRight:`1px solid ${NAV_BORDER}`}}>

        {/* Logo */}
        <div className="px-5 py-5" style={{borderBottom:`1px solid ${NAV_BORDER}`}}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{background: LOGO_BG}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <p className="font-bold text-sm leading-tight" style={{color:'#0d1117'}}>EKM</p>
              <p className="text-xs" style={{color:NAV_TEXT}}>Knowledge Hub</p>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={({ isActive }) => ({
                background: isActive ? '#eff6ff' : 'transparent',
                color:      isActive ? NAV_ACTIVE : NAV_TEXT,
                border:     isActive ? `1px solid #dbeafe` : '1px solid transparent',
              })}
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4" style={{borderTop:`1px solid ${NAV_BORDER}`}}>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full animate-pulse"
              style={{background: NAV_ACCENT}} />
            <span className="text-xs" style={{color:NAV_TEXT}}>MVP v3.7</span>
          </div>
          <p className="text-xs" style={{color:'#475569'}}>
            Press{' '}
            <kbd className="px-1 rounded text-xs"
              style={{background:'#f1f5f9', color:'#4a5568'}}>/</kbd>
            {' '}to search
          </p>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        <Routes>
          <Route path="/intelligence" element={<Intelligence />} />
          <Route path="/"             element={<Dashboard />}    />
          <Route path="/search"       element={<SearchPage />}   />
          <Route path="/documents"    element={<Documents />}    />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <>
      <GlobalSearch />
      <Routes>
        <Route path="/join/:topic" element={<NewJoiner />} />
        <Route path="/*"           element={<AppShell />} />
      </Routes>
    </>
  )
}
