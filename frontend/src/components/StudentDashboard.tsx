import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import { BookMarked, CheckCircle, Award, Bell, ChevronRight } from 'lucide-react'
import { dashboardApi, DashboardStats } from '../api/dashboard'
import { coursesApi, Course } from '../api/courses'
import { announcementsApi, Announcement } from '../api/announcements'
import { marksApi, Marks } from '../api/marks'
import { useAuth } from '../contexts/AuthContext'
import { formatDate } from '../utils/formatters'

export default function StudentDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Partial<DashboardStats>>({})
  const [myCourses, setMyCourses] = useState<Course[]>([])
  const [announcementsList, setAnnouncementsList] = useState<Announcement[]>([])
  const [myMarks, setMyMarks] = useState<Marks[]>([])

  useEffect(() => {
    dashboardApi.getStats().then(setStats).catch(console.error)
    coursesApi.getAll().then(res => setMyCourses(res.data.slice(0, 3))).catch(console.error)
    announcementsApi.getAll().then(setAnnouncementsList).catch(console.error)
    marksApi.getAll().then(setMyMarks).catch(console.error)
  }, [])

  const gpa = stats.overall_gpa?.toFixed(2) || '0.00'
  const avgAttendance = stats.avg_attendance || 0

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      {/* Welcome card */}
      <div className="rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}>
        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white text-xl font-bold">
          {user?.profile?.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
        </div>
        <div className="text-white flex-1">
          <p className="text-sm font-medium opacity-80">Welcome back,</p>
          <h1 className="text-xl font-bold">{user?.profile?.full_name || 'Student'}</h1>
          <p className="text-sm opacity-80 mt-0.5">{user?.profile?.roll_no || ''} · {user?.profile?.dept || ''}</p>
        </div>
        <div className="hidden sm:flex flex-col items-center bg-white/20 rounded-xl px-4 py-2.5 ml-auto">
          <span className="text-2xl font-bold text-white">{gpa}</span>
          <span className="text-xs text-white/80 font-medium">CGPA</span>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Enrolled Courses', value: myCourses.length, icon: <BookMarked className="w-5 h-5" />, color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Avg. Attendance', value: `${avgAttendance}%`, icon: <CheckCircle className="w-5 h-5" />, color: '#22C55E', bg: '#F0FDF4' },
          { label: 'CGPA', value: gpa, icon: <Award className="w-5 h-5" />, color: '#F59E0B', bg: '#FFFBEB' },
          { label: 'Announcements', value: announcementsList.length, icon: <Bell className="w-5 h-5" />, color: '#06B6D4', bg: '#ECFEFF' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{s.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">{s.value}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: s.bg, color: s.color }}>
                {s.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Attendance trend */}
        <div className="xl:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-slate-900">Attendance Trend</h2>
            <p className="text-xs text-slate-400 mt-0.5">Your monthly attendance average</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            {stats.attendance_trend ? (
              <AreaChart data={stats.attendance_trend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
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
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-slate-400">Pending Data</div>
            )}
          </ResponsiveContainer>
        </div>

        {/* Grade distribution */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-slate-900">Grade Distribution</h2>
            <p className="text-xs text-slate-400 mt-0.5">Your current standings</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            {stats.grade_distribution ? (
              <BarChart data={stats.grade_distribution} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="grade" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                  formatter={(v: any) => [v, 'Courses']}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {stats.grade_distribution.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-slate-400">Pending Data</div>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Course attendance breakdown + Marks */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Attendance per course */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Attendance by Course</h2>
          <div className="space-y-4">
            <p className="text-sm text-slate-400">No attendance records found.</p>
          </div>
        </div>

        {/* Marks summary */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Marks & Grades</h2>
          <div className="space-y-3">
            {myMarks.length === 0 && <p className="text-sm text-slate-400">No marks recorded yet.</p>}
            {myMarks.map((m, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-slate-900 truncate flex-1">{m.course_code}</p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="px-2 py-0.5 rounded-lg text-xs font-bold" style={{ background: '#F0FDF4', color: '#22C55E' }}>{m.grade}</span>
                    <span className="text-xs font-bold text-slate-700">{m.total_earned}/175</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>Int-1: {m.internal_1}/25</span>
                  <span>Int-2: {m.internal_2}/25</span>
                  <span>Final: {m.semester_final}/75</span>
                  <span>Prac: {m.practical}/50</span>
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${((m.total_earned || 0) / 175) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Announcements */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-900">Announcements</h2>
          <button className="flex items-center gap-1 text-xs font-medium" style={{ color: '#2563EB' }}>
            View all <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="space-y-3">
          {announcementsList.length === 0 && <p className="text-sm text-slate-400">No announcements.</p>}
            {announcementsList.map(a => (
              <div key={a.id} className="p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200 cursor-pointer">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase bg-white text-slate-500 shadow-sm border border-slate-100">
                    {a.priority}
                  </span>
                  <span className="text-xs text-slate-400 ml-auto">{formatDate(a.created_at)}</span>
                </div>
                <p className="text-sm font-semibold text-slate-900 mb-1 leading-snug">{a.title}</p>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{a.message}</p>
              </div>
          ))}
        </div>
      </div>
    </div>
  )
}
