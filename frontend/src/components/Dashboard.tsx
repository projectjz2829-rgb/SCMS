import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import { Users, UserCheck, BookOpen, ClipboardList, TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { dashboardApi } from '../api/dashboard'
import { announcementsApi, Announcement } from '../api/announcements'
import { activitiesApi, Activity as ActivityModel } from '../api/activities'
import { notificationsApi } from '../api/notifications'
import { formatDateTime, formatDate } from '../utils/formatters'
import { Bell } from 'lucide-react'

const defaultStats = [
  { id: 'students', label: 'Total Students', value: 0, icon: <Users className="w-5 h-5" />, color: '#2563EB', bg: '#EFF6FF', change: '+12', up: true },
  { id: 'faculty', label: 'Total Faculty', value: 0, icon: <UserCheck className="w-5 h-5" />, color: '#06B6D4', bg: '#ECFEFF', change: '+2', up: true },
  { id: 'courses', label: 'Total Courses', value: 0, icon: <BookOpen className="w-5 h-5" />, color: '#22C55E', bg: '#F0FDF4', change: '+1', up: true },
  { id: 'avg_attendance', label: 'Average Attendance', value: 0, icon: <ClipboardList className="w-5 h-5" />, color: '#F59E0B', bg: '#FFFBEB', change: '-3%', up: false },
]

const activityIcons: Record<string, string> = {
  'user-plus': '👤', 'book-open': '📖', 'megaphone': '📢', 'check-circle': '✅',
  'file-text': '📄', 'edit': '✏️', 'user-check': '👨‍🏫', 'plus-circle': '➕', 'trash-2': '🗑️',
}

export default function Dashboard() {
  const [stats, setStats] = useState(defaultStats)
  const [activitiesList, setActivitiesList] = useState<ActivityModel[]>([])
  const [announcementsList, setAnnouncementsList] = useState<Announcement[]>([])
  const [notificationsList, setNotificationsList] = useState<Announcement[]>([])
  const [attendanceTrendList, setAttendanceTrendList] = useState<{month: string, attendance: number}[]>([])
  const [studentsByDeptList, setStudentsByDeptList] = useState<{name: string, students: number, fill: string}[]>([])

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await dashboardApi.getStats()
        setStats(prev => prev.map(s => {
          if (s.id === 'students') return { ...s, value: data.total_students }
          if (s.id === 'faculty') return { ...s, value: data.total_faculty || 0 }
          if (s.id === 'courses') return { ...s, value: data.total_courses }
          if (s.id === 'avg_attendance') return { ...s, value: data.avg_attendance }
          return s
        }))
        if (data.attendance_trend) setAttendanceTrendList(data.attendance_trend)
        if (data.students_by_dept) setStudentsByDeptList(data.students_by_dept)
      } catch (e) {
        console.error("Failed to load dashboard stats", e)
      }
    }
    async function loadActivities() {
      try {
        const data = await activitiesApi.getAll(6)
        setActivitiesList(data)
      } catch (e) {
        console.error("Failed to load activities", e)
      }
    }
    async function loadAnnouncements() {
      try {
        const data = await announcementsApi.getAll()
        setAnnouncementsList(data.slice(0, 5))
      } catch (e) {
        console.error("Failed to load announcements", e)
      }
    }
    async function loadNotifications() {
      try {
        const data = await notificationsApi.getUnread()
        setNotificationsList(data.slice(0, 5))
      } catch (e) {
        console.error("Failed to load notifications", e)
      }
    }
    loadStats()
    loadActivities()
    loadAnnouncements()
    loadNotifications()
    
    // Auto-refresh for dashboard widget
    const interval = setInterval(() => {
        loadNotifications()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">Welcome back! Here's what's happening at your campus.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.label}</p>
                <p className="text-3xl font-bold text-slate-900 mt-2 tabular-nums">{(stat.value ?? 0).toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-2">
                  {stat.up
                    ? <TrendingUp className="w-3 h-3" style={{ color: '#22C55E' }} />
                    : <TrendingDown className="w-3 h-3" style={{ color: '#EF4444' }} />}
                  <span className="text-xs font-medium" style={{ color: stat.up ? '#22C55E' : '#EF4444' }}>
                    {stat.change} this month
                  </span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: stat.bg, color: stat.color }}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-2 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-slate-900">Attendance Trend</h2>
            <p className="text-xs text-slate-400 mt-0.5">Overall average across all departments</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={attendanceTrendList} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="attendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} domain={[60, 100]} />
              <Tooltip
                contentStyle={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                formatter={(v: any) => [`${v}%`, 'Attendance']}
              />
              <Area type="monotone" dataKey="attendance" stroke="#2563EB" strokeWidth={2.5} fill="url(#attendGrad)" dot={{ fill: '#2563EB', strokeWidth: 0, r: 4 }} activeDot={{ r: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Students by dept */}
        <div className="xl:col-span-2 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-slate-900">Students by Department</h2>
            <p className="text-xs text-slate-400 mt-0.5">Current enrollment distribution</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={studentsByDeptList} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                formatter={(v: any) => [v, 'Students']}
              />
              <Bar dataKey="students" radius={[6, 6, 0, 0]}>
                {studentsByDeptList.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recent Activity */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Recent Activity</h2>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>
          <div className="space-y-3">
            {activitiesList.slice(0, 6).map(act => (
              <div key={act.id} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
                <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-sm flex-shrink-0">
                  {activityIcons[act.icon] || '📌'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-800 leading-snug">{act.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-400">by {act.actor}</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full" />
                    <span className="text-xs text-slate-400">{formatDateTime(act.timestamp, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Latest Announcements */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Latest Announcements</h2>
            <span className="text-xs text-slate-400">{announcementsList.length} total</span>
          </div>
          <div className="space-y-3">
            {announcementsList.slice(0, 5).map(ann => (
              <div key={ann.id} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-slate-900 truncate">{ann.title}</p>
                    {ann.pinned && (
                      <span className="px-1.5 py-0.5 rounded-md text-xs font-medium" style={{ background: '#EFF6FF', color: '#2563EB' }}>Pinned</span>
                    )}
                    <span className={`px-1.5 py-0.5 rounded-md text-xs font-medium ${
                      ann.priority === 'urgent' ? 'bg-red-50 text-red-600' :
                      ann.priority === 'important' ? 'bg-yellow-50 text-yellow-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {ann.priority}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{ann.message}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{formatDate(ann.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Unread Notifications */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Unread Notifications</h2>
            <Bell className="w-4 h-4 text-slate-400" />
          </div>
          <div className="space-y-3">
            {notificationsList.length === 0 && (
                <div className="text-sm text-slate-500 text-center py-4">No unread notifications</div>
            )}
            {notificationsList.map(n => (
              <div key={n.id} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-blue-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{n.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{n.message}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDate(n.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
