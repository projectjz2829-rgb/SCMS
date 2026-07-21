import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { BookMarked, Users, CheckCircle, ClipboardList, Award, TrendingUp } from 'lucide-react'
import { dashboardApi, DashboardStats } from '../api/dashboard'
import { coursesApi, Course } from '../api/courses'
import { announcementsApi, Announcement } from '../api/announcements'
import { useAuth } from '../contexts/AuthContext'
import { EmptyState } from './ui/EmptyState'
import { BarChart as BarChartIcon, PieChart } from 'lucide-react'
import { formatDate } from '../utils/formatters'

export default function FacultyDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Partial<DashboardStats>>({})
  const [myCourses, setMyCourses] = useState<Course[]>([])
  const [announcementsList, setAnnouncementsList] = useState<Announcement[]>([])

  useEffect(() => {
    dashboardApi.getStats().then(setStats).catch(console.error)
    coursesApi.getAll().then(res => setMyCourses(res.data.slice(0, 3))).catch(console.error)
    announcementsApi.getAll().then(setAnnouncementsList).catch(console.error)
  }, [])

  const quickStats = [
    { label: 'Assigned Courses', value: stats.total_courses || 0, icon: <BookMarked className="w-5 h-5" />, color: '#06B6D4', bg: '#ECFEFF' },
    { label: "Total Students", value: stats.total_students || 0, icon: <Users className="w-5 h-5" />, color: '#2563EB', bg: '#EFF6FF' },
    { label: 'Avg. Attendance', value: `${stats.avg_attendance || 0}%`, icon: <CheckCircle className="w-5 h-5" />, color: '#22C55E', bg: '#F0FDF4' },
    { label: 'Marks Pending', value: 1, icon: <ClipboardList className="w-5 h-5" />, color: '#F59E0B', bg: '#FFFBEB' },
  ]
  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      {/* Welcome */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4" style={{ background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)' }}>
        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white text-xl font-bold">
          {user?.profile?.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
        </div>
        <div className="text-white">
          <p className="text-sm font-medium opacity-80">Good morning,</p>
          <h1 className="text-xl font-bold">{user?.profile?.full_name || 'Faculty'}</h1>
          <p className="text-sm opacity-80 mt-0.5">{user?.profile?.dept || ''}</p>
        </div>
        <div className="ml-auto hidden sm:flex items-center gap-2 bg-white/20 rounded-xl px-4 py-2">
          <Award className="w-4 h-4 text-white" />
          <span className="text-white text-sm font-semibold">12 yrs experience</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {quickStats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{s.label}</p>
                <p className="text-3xl font-bold text-slate-900 mt-2 tabular-nums">{s.value}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: s.bg, color: s.color }}>
                {s.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts + Today's schedule */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Weekly attendance chart */}
        <div className="xl:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Weekly Attendance</h2>
              <p className="text-xs text-slate-400">Present vs Absent — Your Courses</p>
            </div>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            {stats.weekly_attendance ? (
              <BarChart data={stats.weekly_attendance} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="present" name="Present" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="absent" name="Absent" fill="#FEE2E2" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-slate-400">Pending Data</div>
            )}
          </ResponsiveContainer>
        </div>

        {/* Today's schedule */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Today's Schedule</h2>
            <span className="text-xs text-slate-400">Mon, Oct 7</span>
          </div>
          <div className="space-y-3">
            {stats.schedule?.map((s, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-slate-600">{s.time}</p>
                </div>
                <div className="w-px h-10 bg-cyan-200 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">{s.course}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{s.room} · {s.students} students</p>
                </div>
              </div>
            ))}
            {!stats.schedule && <div className="text-sm text-slate-400 p-4">No schedule available.</div>}
          </div>
        </div>
      </div>

      {/* My courses + announcements */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">My Courses</h2>
          <div className="space-y-3">
            {myCourses.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-cyan-200 hover:bg-cyan-50/30 transition-all">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-cyan-50">
                  <BookMarked className="w-4 h-4 text-cyan-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.code} · Sem {c.semester}</p>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Users className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{c.enrolled_count || 0}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Recent Announcements</h2>
          <div className="space-y-3">
            {announcementsList.length === 0 && <p className="text-sm text-slate-400">No announcements.</p>}
            {announcementsList.slice(0, 4).map(a => (
              <div key={a.id} className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-900">{a.title}</p>
                  <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500`}>
                    {a.priority}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-900 mb-1 leading-snug">{a.title}</p>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{a.message}</p>
                <p className="text-xs text-slate-400 mt-1">{formatDate(a.created_at)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Analytics (Empty States) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Course Averages & Pass Percentage</h2>
          <div className="h-48 flex items-center justify-center">
            <EmptyState 
              icon={<BarChartIcon className="w-6 h-6 text-slate-400" />} 
              title="No Analytics Data" 
              description="Course averages and pass percentage data is currently unavailable." 
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Grade Distribution & Student Performance</h2>
          <div className="h-48 flex items-center justify-center">
            <EmptyState 
              icon={<PieChart className="w-6 h-6 text-slate-400" />} 
              title="No Analytics Data" 
              description="Grade distribution and student performance data is currently unavailable." 
            />
          </div>
        </div>
      </div>
    </div>
  )
}
