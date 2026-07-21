import React, { useState } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, Users, UserCheck, BookOpen, Megaphone, Activity,
  Settings, LogOut, GraduationCap, Bell, Search, ChevronDown,
  Menu, X, ClipboardList, BarChart3, User, BookMarked, FileSpreadsheet
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Announcement } from '../api/announcements'
import { notificationsApi } from '../api/notifications'
import { formatDate } from '../utils/formatters'

interface NavItem {
  id: string
  path: string
  label: string
  icon: React.ReactNode
}

const adminNav: NavItem[] = [
  { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'students', path: '/students', label: 'Students', icon: <Users className="w-4 h-4" /> },
  { id: 'faculty', path: '/faculty', label: 'Faculty', icon: <UserCheck className="w-4 h-4" /> },
  { id: 'courses', path: '/courses', label: 'Courses', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'announcements', path: '/announcements', label: 'Announcements', icon: <Megaphone className="w-4 h-4" /> },
  { id: 'reports', path: '/reports', label: 'Reports', icon: <FileSpreadsheet className="w-4 h-4" /> },
  { id: 'activity', path: '/activity', label: 'Activity', icon: <Activity className="w-4 h-4" /> },
  { id: 'settings', path: '/settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
]

const facultyNav: NavItem[] = [
  { id: 'faculty-dashboard', path: '/faculty-dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'courses', path: '/courses', label: 'My Courses', icon: <BookMarked className="w-4 h-4" /> },
  { id: 'attendance', path: '/attendance', label: 'Attendance', icon: <ClipboardList className="w-4 h-4" /> },
  { id: 'marks', path: '/marks', label: 'Marks', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'announcements', path: '/announcements', label: 'Announcements', icon: <Megaphone className="w-4 h-4" /> },
  { id: 'reports', path: '/reports', label: 'Reports', icon: <FileSpreadsheet className="w-4 h-4" /> },
  { id: 'profile', path: '/profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
  { id: 'settings', path: '/settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
]

const studentNav: NavItem[] = [
  { id: 'student-dashboard', path: '/student-dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'courses', path: '/courses', label: 'My Courses', icon: <BookMarked className="w-4 h-4" /> },
  { id: 'attendance', path: '/attendance', label: 'Attendance', icon: <ClipboardList className="w-4 h-4" /> },
  { id: 'marks', path: '/marks', label: 'Marks', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'announcements', path: '/announcements', label: 'Announcements', icon: <Megaphone className="w-4 h-4" /> },
  { id: 'profile', path: '/profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
  { id: 'settings', path: '/settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
]

const roleColor = {
  admin: '#2563EB',
  faculty: '#06B6D4',
  student: '#22C55E',
}

export default function Layout() {
  const { user, role, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [notificationsList, setNotificationsList] = useState<Announcement[]>([])

  React.useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (role && user) {
      const fetchNotifications = () => {
        notificationsApi.getUnread().then(setNotificationsList).catch(console.error)
      }
      fetchNotifications()
      interval = setInterval(fetchNotifications, 30000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [role, user])

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead()
      setNotificationsList([])
    } catch (err) {
      console.error(err)
    }
  }

  if (!role || !user) return null

  const nav = role === 'admin' ? adminNav : role === 'faculty' ? facultyNav : studentNav
  
  // Use mock for now until we integrate real profile data API
  const userProfile = {
    label: user.profile?.full_name || user.email,
    sub: user.profile?.roll_no || user.profile?.emp_id || role,
    avatar: (user.profile?.full_name || user.email || 'A').substring(0, 2).toUpperCase()
  }
  const unread = notificationsList.length // Mocking unread status as just total length since notifications lack read state

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* Sidebar */}
      <aside
        className="sidebar-glass flex-shrink-0 flex flex-col transition-all duration-300 z-30"
        style={{ width: sidebarOpen ? 240 : 72 }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg" style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}>
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <p className="text-white font-bold text-sm leading-tight">SCMS</p>
              <p className="text-slate-400 text-xs">Campus Portal</p>
            </div>
          )}
        </div>

        {/* Role badge */}
        {sidebarOpen && (
          <div className="mx-3 mt-4 mb-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: roleColor[role] }}>
                {userProfile.avatar}
              </div>
              <div className="overflow-hidden">
                <p className="text-white text-xs font-semibold truncate">{userProfile.label}</p>
                <p className="text-slate-400 text-xs truncate">{userProfile.sub}</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {nav.map(item => {
            const isActive = location.pathname.startsWith(item.path)
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                  isActive
                    ? 'text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/8'
                }`}
                style={isActive ? { background: roleColor[role], boxShadow: `0 2px 8px ${roleColor[role]}40` } : {}}
                title={!sidebarOpen ? item.label : undefined}
              >
                <span className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>
                  {item.icon}
                </span>
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-2 pb-4 border-t border-white/10 pt-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 text-sm font-medium transition-all duration-150"
            title={!sidebarOpen ? 'Logout' : undefined}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navbar */}
        <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-100 flex items-center px-4 gap-4 flex-shrink-0 z-20">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Search */}
          <div className="flex-1 max-w-sm relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search students, courses..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent text-slate-900 placeholder-slate-400"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false) }}
                className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unread > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold leading-none">
                    {unread}
                  </span>
                )}
              </button>

                {notifOpen && (
                  <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <p className="font-semibold text-slate-900">Notifications</p>
                      <button type="button" onClick={handleMarkAllRead} className="text-xs text-blue-600 font-medium hover:text-blue-700">Mark all read</button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notificationsList.length === 0 && (
                        <div className="p-4 text-center text-sm text-slate-500">No notifications</div>
                      )}
                      {notificationsList.map(n => (
                        <button 
                          key={n.id}
                          onClick={async () => {
                            try {
                              await notificationsApi.markRead(n.id)
                              setNotificationsList(prev => prev.filter(item => item.id !== n.id))
                              setNotifOpen(false)
                              navigate('/announcements')
                            } catch (e) {
                              console.error(e)
                            }
                          }}
                          className="w-full text-left p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors flex gap-3"
                        >
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-blue-500`} />
                          <div>
                            <p className="text-sm text-slate-900 font-medium">{n.title}</p>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{n.message}</p>
                            <p className="text-[10px] text-slate-400 mt-2">{formatDate(n.created_at)}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            {/* Profile */}
            <div className="relative">
              <button
                onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false) }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: roleColor[role] }}>
                  {userProfile.avatar}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold text-slate-900 leading-tight">{userProfile.label}</p>
                  <p className="text-xs text-slate-500">{role}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-12 w-48 glass rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden py-1">
                  <Link to="/profile" onClick={() => setProfileOpen(false)} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" /> Profile
                  </Link>
                  <Link to="/settings" onClick={() => setProfileOpen(false)} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-slate-400" /> Settings
                  </Link>
                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto" onClick={() => { setNotifOpen(false); setProfileOpen(false) }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
