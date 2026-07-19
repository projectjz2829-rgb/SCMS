import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, Save, Loader2, ChevronDown, Users } from 'lucide-react'
import { coursesApi, Course } from '../api/courses'
import { attendanceApi } from '../api/attendance'
import { useToast } from '../contexts/ToastContext'
import { EmptyState } from './ui/EmptyState'
import { SkeletonRow } from './ui/Skeleton'

type AttStatus = 'present' | 'absent' | 'late'

const statusConfig: Record<AttStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  present: { label: 'Present', color: '#22C55E', bg: '#F0FDF4', icon: <CheckCircle className="w-4 h-4" /> },
  absent: { label: 'Absent', color: '#EF4444', bg: '#FEF2F2', icon: <XCircle className="w-4 h-4" /> },
  late: { label: 'Late', color: '#F59E0B', bg: '#FFFBEB', icon: <Clock className="w-4 h-4" /> },
}

export default function Attendance() {
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null)
  const [courseStudents, setCourseStudents] = useState<any[]>([])
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [attendance, setAttendance] = useState<Record<number, AttStatus>>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const { success, error } = useToast()

  useEffect(() => {
    coursesApi.getAll().then(data => {
      setCourses(data)
      if (data.length > 0) {
        setSelectedCourse(data[0].id!)
      }
    })
  }, [])

  useEffect(() => {
    if (selectedCourse && date) {
      setLoading(true)
      Promise.all([
        coursesApi.getStudents(selectedCourse),
        attendanceApi.getAll({ course_id: selectedCourse, date })
      ]).then(([students, records]) => {
        setCourseStudents(students)
        const init: Record<number, AttStatus> = {}
        students.forEach(s => {
          const rec = records.find(r => r.student_id === s.id)
          init[s.id] = rec ? rec.status : 'present'
        })
        setAttendance(init)
      }).catch(() => {
        error('Failed to load attendance data')
      }).finally(() => {
        setLoading(false)
      })
    }
  }, [selectedCourse, date])

  const course = courses.find(c => c.id === selectedCourse)

  const counts = {
    present: courseStudents.filter(s => attendance[s.id] === 'present').length,
    absent: courseStudents.filter(s => attendance[s.id] === 'absent').length,
    late: courseStudents.filter(s => attendance[s.id] === 'late').length,
  }

  const setAll = (status: AttStatus) => {
    const updated: Record<number, AttStatus> = {}
    courseStudents.forEach(s => { updated[s.id] = status })
    setAttendance(prev => ({ ...prev, ...updated }))
  }

  const handleSave = async () => {
    if (!selectedCourse) return
    setSaving(true)
    try {
      await attendanceApi.markBatch({
        course_id: selectedCourse,
        date: date,
        records: courseStudents.map(s => ({ student_id: s.id, status: attendance[s.id] }))
      })
      setSaved(true)
      success('Attendance saved successfully')
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      error('Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-5 max-w-screen-xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
        <p className="text-slate-500 text-sm mt-0.5">Mark and manage student attendance</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-52">
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Course</label>
          <div className="relative">
            <select value={selectedCourse || ''} onChange={e => setSelectedCourse(Number(e.target.value))}
              className="w-full pl-3 pr-8 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none appearance-none font-medium text-slate-900">
              {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none text-slate-900" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAll('present')} className="px-3 py-2 text-xs font-semibold rounded-xl border transition-colors" style={{ borderColor: '#22C55E', color: '#22C55E', background: '#F0FDF4' }}>All Present</button>
          <button onClick={() => setAll('absent')} className="px-3 py-2 text-xs font-semibold rounded-xl border transition-colors" style={{ borderColor: '#EF4444', color: '#EF4444', background: '#FEF2F2' }}>All Absent</button>
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex items-center gap-3 flex-wrap">
        {(Object.keys(statusConfig) as AttStatus[]).map(s => (
          <div key={s} className="flex items-center gap-2 px-4 py-2 rounded-xl border" style={{ background: statusConfig[s].bg, borderColor: `${statusConfig[s].color}30` }}>
            <span style={{ color: statusConfig[s].color }}>{statusConfig[s].icon}</span>
            <span className="text-sm font-bold" style={{ color: statusConfig[s].color }}>{counts[s]}</span>
            <span className="text-xs text-slate-500 font-medium">{statusConfig[s].label}</span>
          </div>
        ))}
        <div className="ml-auto text-xs text-slate-400">
          {courseStudents.length} students • {course?.name || ''}
        </div>
      </div>

      {/* Student list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</span>
          </div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mark Status</span>
        </div>
        <div className="divide-y divide-slate-50">
          {loading ? (
            <>
              <SkeletonRow cols={2} />
              <SkeletonRow cols={2} />
              <SkeletonRow cols={2} />
              <SkeletonRow cols={2} />
              <SkeletonRow cols={2} />
            </>
          ) : courseStudents.length === 0 ? (
            <div className="p-4">
              <EmptyState 
                icon={<Users className="w-6 h-6" />}
                title="No students found" 
                description="There are no students enrolled in this course."
              />
            </div>
          ) : courseStudents.map(s => {
            const status = attendance[s.id] || 'present'
            return (
              <div key={s.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors group">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, #2563EB, #06B6D4)' }}>
                  {s.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{s.full_name}</p>
                  <p className="text-xs text-slate-400">{s.roll_no}</p>
                </div>
                {/* Status buttons */}
                <div className="flex items-center gap-2">
                  {(Object.keys(statusConfig) as AttStatus[]).map(st => (
                    <button
                      key={st}
                      onClick={() => setAttendance(prev => ({ ...prev, [s.id]: st }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 ${
                        status === st ? 'shadow-sm scale-105' : 'opacity-40 hover:opacity-70'
                      }`}
                      style={status === st ? { background: statusConfig[st].bg, color: statusConfig[st].color, borderColor: `${statusConfig[st].color}50` } : { background: '#F8FAFC', color: '#94A3B8', borderColor: '#E2E8F0' }}
                    >
                      {statusConfig[st].icon}
                      <span className="hidden sm:inline">{statusConfig[st].label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Marking attendance for <strong className="text-slate-700">{course?.code || ''}</strong> on <strong className="text-slate-700">{new Date(date + 'T00:00:00').toDateString()}</strong>
        </p>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl shadow-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
          style={{ background: saved ? 'linear-gradient(135deg, #22C55E, #16A34A)' : 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}>
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            : saved ? <><CheckCircle className="w-4 h-4" /> Saved!</>
            : <><Save className="w-4 h-4" /> Save Attendance</>}
        </button>
      </div>
    </div>
  )
}
