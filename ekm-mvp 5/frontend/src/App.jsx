import { Routes, Route, NavLink } from 'react-router-dom'
import { LayoutDashboard, Search, FileText, Lightbulb } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import SearchPage from './pages/Search'
import Documents from './pages/Documents'
import Intelligence from './pages/Intelligence'
import ThemeToggle from './ThemeToggle'
import { T } from './theme'

const NAV = [
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/search',       icon: Search,          label: 'Search'       },
  { to: '/documents',    icon: FileText,        label: 'Documents'    },
  { to: '/intelligence', icon: Lightbulb,       label: 'Intelligence' },
]

export default function App() {
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
          <ThemeToggle />
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        <Routes>
          <Route path="/"             element={<Dashboard />}    />
          <Route path="/search"       element={<SearchPage />}   />
          <Route path="/documents"    element={<Documents />}    />
          <Route path="/intelligence" element={<Intelligence />} />
        </Routes>
      </main>
    </div>
  )
}
