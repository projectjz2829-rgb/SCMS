import { useState, useEffect, useRef } from 'react'
import { CheckCircle, XCircle, Clock, BookOpen } from 'lucide-react'
import { studentsApi, StudentAttendanceRecord } from '../api/students'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { EmptyState } from './ui/EmptyState'
import { SkeletonTable } from './ui/Skeleton'
import { formatDate } from '../utils/formatters'

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  present: { label: 'Present', color: '#22C55E', bg: '#F0FDF4', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  absent: { label: 'Absent', color: '#EF4444', bg: '#FEF2F2', icon: <XCircle className="w-3.5 h-3.5" /> },
  late: { label: 'Late', color: '#F59E0B', bg: '#FFFBEB', icon: <Clock className="w-3.5 h-3.5" /> },
}

interface CourseAttendanceSummary {
  courseId: number
  courseCode: string
  courseName: string
  total: number
  present: number
  absent: number
  late: number
  percentage: number
  records: StudentAttendanceRecord[]
}

function buildSummaries(records: StudentAttendanceRecord[]): CourseAttendanceSummary[] {
  const map = new Map<number, CourseAttendanceSummary>()
  for (const r of records) {
    if (!map.has(r.course_id)) {
      map.set(r.course_id, {
        courseId: r.course_id,
        courseCode: r.course_code,
        courseName: r.course_name,
        total: 0, present: 0, absent: 0, late: 0, percentage: 0,
        records: [],
      })
    }
    const entry = map.get(r.course_id)!
    entry.total += 1
    if (r.status === 'present') entry.present += 1
    else if (r.status === 'absent') entry.absent += 1
    else if (r.status === 'late') entry.late += 1
    entry.records.push(r)
  }
  for (const entry of map.values()) {
    entry.percentage = entry.total > 0
      ? Math.round(((entry.present + entry.late) / entry.total) * 100)
      : 0
  }
  return Array.from(map.values()).sort((a, b) => a.courseCode.localeCompare(b.courseCode))
}

export default function StudentAttendance() {
  const { user } = useAuth()
  const { error } = useToast()
  const [summaries, setSummaries] = useState<CourseAttendanceSummary[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const studentId = user?.profile?.id as number | undefined
    if (!studentId) {
      setLoading(false)
      return
    }

    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setLoading(true)

    studentsApi.getMyAttendance(studentId)
      .then(records => {
        const built = buildSummaries(records)
        setSummaries(built)
        if (built.length > 0) setSelectedCourseId(built[0].courseId)
      })
      .catch(() => error('Failed to load attendance records'))
      .finally(() => setLoading(false))

    return () => { abortRef.current?.abort() }
  }, [user])

  const selected = summaries.find(s => s.courseId === selectedCourseId)

  return (
    <div className="p-6 space-y-5 max-w-screen-xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Attendance</h1>
        <p className="text-slate-500 text-sm mt-0.5">View your attendance records across all enrolled courses</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <SkeletonTable rows={5} cols={4} />
        </div>
      ) : summaries.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-6 h-6" />}
          title="No attendance records"
          description="Your attendance records will appear here once your faculty starts marking attendance."
        />
      ) : (
        <>
          {/* Course summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {summaries.map(s => {
              const pctColor = s.percentage >= 75 ? '#22C55E' : s.percentage >= 60 ? '#F59E0B' : '#EF4444'
              const isSelected = s.courseId === selectedCourseId
              return (
                <button
                  key={s.courseId}
                  onClick={() => setSelectedCourseId(s.courseId)}
                  className={`text-left p-5 rounded-2xl border-2 transition-all ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{s.courseCode}</p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[160px]">{s.courseName}</p>
                    </div>
                    <span className="text-xl font-bold tabular-nums" style={{ color: pctColor }}>{s.percentage}%</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 font-medium" style={{ color: '#22C55E' }}>
                      <CheckCircle className="w-3 h-3" />{s.present} Present
                    </span>
                    <span className="flex items-center gap-1 font-medium" style={{ color: '#EF4444' }}>
                      <XCircle className="w-3 h-3" />{s.absent} Absent
                    </span>
                    {s.late > 0 && (
                      <span className="flex items-center gap-1 font-medium" style={{ color: '#F59E0B' }}>
                        <Clock className="w-3 h-3" />{s.late} Late
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Detail records for selected course */}
          {selected && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">
                  {selected.courseCode} — {selected.courseName}
                </span>
                <span className="text-xs text-slate-400">{selected.records.length} sessions</span>
              </div>
              <div className="divide-y divide-slate-50">
                {selected.records
                  .slice()
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map(r => {
                    const cfg = statusConfig[r.status] ?? statusConfig.absent
                    return (
                      <div key={r.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                        <span className="text-sm text-slate-700 font-medium">{formatDate(r.date)}</span>
                        <span
                          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold"
                          style={{ background: cfg.bg, color: cfg.color }}
                        >
                          {cfg.icon}{cfg.label}
                        </span>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
