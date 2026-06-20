import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Icon } from './Icon'

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth()

  const initials = (user?.name || '?')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <Icon.Shield style={{ color: '#1A1300' }} />
        </div>
        <span className="brand-name">Sentinel</span>
      </div>

      <div className="nav-section-label">Workspace</div>
      <NavLink to="/submit" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Icon.Upload /> Submit images
      </NavLink>
      <NavLink to="/history" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Icon.History /> My submissions
      </NavLink>
      <NavLink to="/appeals" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Icon.Flag /> My appeals
      </NavLink>

      {isAdmin && (
        <>
          <div className="nav-section-label">Administration</div>
          <NavLink to="/admin" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Icon.BarChart /> Analytics
          </NavLink>
          <NavLink to="/admin/queue" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Icon.Inbox /> Appeal queue
          </NavLink>
          <NavLink to="/admin/submissions" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Icon.Grid /> All submissions
          </NavLink>
          <NavLink to="/admin/policies" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Icon.Sliders /> Policy config
          </NavLink>
        </>
      )}

      <div className="sidebar-footer">
        <div className="user-chip">
          <div className="user-avatar">{initials}</div>
          <div className="user-meta">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.role}</div>
          </div>
        </div>
        <button className="logout-btn" onClick={logout}>
          <Icon.LogOut /> Sign out
        </button>
      </div>
    </aside>
  )
}
