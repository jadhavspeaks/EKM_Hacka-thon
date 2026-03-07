import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Search, FileText, Lightbulb, Brain } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import SearchPage from './pages/Search'
import Documents from './pages/Documents'
import Intelligence from './pages/Intelligence'
import NewJoiner from './pages/NewJoiner'
import GlobalSearch from './components/GlobalSearch'

const NAV = [
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/search',       icon: Search,          label: 'Search'       },
  { to: '/documents',    icon: FileText,        label: 'Documents'    },
  { to: '/intelligence', icon: Lightbulb,       label: 'Intelligence' },
]

function AppShell() {
  const location = useLocation()
  const isDash = location.pathname === '/'
  const isFull = location.pathname === '/' || location.pathname === '/intelligence'
  return (
    <div className="flex h-screen overflow-hidden" style={{background:'#07111f'}}>
      <aside className="w-56 flex flex-col shrink-0" style={{background:'#0a1628', borderRight:'1px solid #1a3050'}}>
        <div className="px-5 py-5" style={{borderBottom:'1px solid #1a3050'}}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{background:'linear-gradient(135deg,#00d4aa,#00a88a)'}}>
              <Brain size={18} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-sm leading-tight" style={{color:'#e2eaf4'}}>EKM</p>
              <p className="text-xs" style={{color:'#3d5a7a'}}>Knowledge Hub</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-white'
                    : 'hover:text-white'
                }`
              }
              style={({ isActive }) => ({
                background: isActive ? 'rgba(0,212,170,0.15)' : 'transparent',
                color: isActive ? '#00d4aa' : '#6b8aad',
                border: isActive ? '1px solid rgba(0,212,170,0.25)' : '1px solid transparent',
              })}
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4" style={{borderTop:'1px solid #1a3050'}}>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{background:'#00d4aa'}} />
            <span className="text-xs" style={{color:'#3d5a7a'}}>MVP v3.0</span>
          </div>
          <p className="text-xs" style={{color:'#3d5a7a'}}>
            Press <kbd className="px-1 rounded text-xs" style={{background:'#1a3050',color:'#6b8aad'}}>/</kbd> to search
          </p>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto flex flex-col">
        <Routes>
          <Route path="/intelligence" element={<Intelligence />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/search"    element={<div className="max-w-6xl mx-auto p-6 w-full bg-gray-50 min-h-full"><SearchPage /></div>} />
          <Route path="/documents" element={<div className="max-w-6xl mx-auto p-6 w-full bg-gray-50 min-h-full"><Documents /></div>} />
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
        <Route path="/*" element={<AppShell />} />
      </Routes>
    </>
  )
}
