import { useState, useEffect, useRef } from 'react'
import { Award, FileSpreadsheet } from 'lucide-react'
import { studentsApi, StudentMarkRecord } from '../api/students'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { EmptyState } from './ui/EmptyState'
import { SkeletonTable } from './ui/Skeleton'

const MAX_MARKS = 175

function calcGrade(total: number): [string, number] {
  const pct = (total / MAX_MARKS) * 100
  if (pct >= 90) return ['O', 10.0]
  if (pct >= 80) return ['A+', 9.0]
  if (pct >= 70) return ['A', 8.0]
  if (pct >= 60) return ['B+', 7.0]
  if (pct >= 50) return ['B', 6.0]
  return ['U', 0.0]
}

const gradeColor: Record<string, [string, string]> = {
  O: ['#F0FDF4', '#22C55E'],
  'A+': ['#F0FDF4', '#22C55E'],
  A: ['#EFF6FF', '#2563EB'],
  'B+': ['#EFF6FF', '#2563EB'],
  B: ['#FFFBEB', '#F59E0B'],
  U: ['#FEF2F2', '#EF4444'],
}

export default function StudentMarks() {
  const { user } = useAuth()
  const { error } = useToast()
  const [marks, setMarks] = useState<StudentMarkRecord[]>([])
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

    studentsApi.getMyMarks(studentId)
      .then(setMarks)
      .catch(() => error('Failed to load marks'))
      .finally(() => setLoading(false))

    return () => { abortRef.current?.abort() }
  }, [user])

  const totalGP = marks.reduce((acc, m) => {
    const total = m.internal_1 + m.internal_2 + m.semester_final + m.practical
    const [, gp] = calcGrade(total)
    return acc + gp
  }, 0)
  const cgpa = marks.length > 0 ? (totalGP / marks.length).toFixed(2) : '—'

  return (
    <div className="p-6 space-y-5 max-w-screen-xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Marks</h1>
          <p className="text-slate-500 text-sm mt-0.5">View your academic performance across all courses</p>
        </div>
        {!loading && marks.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <Award className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-xs text-slate-400 font-medium">Current CGPA</p>
              <p className="text-lg font-bold text-slate-900 tabular-nums">{cgpa}</p>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <SkeletonTable rows={5} cols={7} />
        </div>
      ) : marks.length === 0 ? (
        <EmptyState
          icon={<FileSpreadsheet className="w-6 h-6" />}
          title="No marks recorded"
          description="Your marks will appear here once your faculty uploads them."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Course</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Internal 1 <span className="font-normal text-slate-400">/20</span>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Internal 2 <span className="font-normal text-slate-400">/20</span>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Semester <span className="font-normal text-slate-400">/50</span>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Practical <span className="font-normal text-slate-400">/25</span>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Grade</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">GPA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {marks.map(m => {
                  const total = m.internal_1 + m.internal_2 + m.semester_final + m.practical
                  const [grade, gp] = calcGrade(total)
                  const [gbg, gfg] = gradeColor[grade] ?? ['#F8FAFC', '#64748B']
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-900">{m.course_code}</p>
                        {m.course_name && (
                          <p className="text-xs text-slate-400 mt-0.5">{m.course_name}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center font-medium text-slate-700">{m.internal_1}</td>
                      <td className="px-4 py-3.5 text-center font-medium text-slate-700">{m.internal_2}</td>
                      <td className="px-4 py-3.5 text-center font-medium text-slate-700">{m.semester_final}</td>
                      <td className="px-4 py-3.5 text-center font-medium text-slate-700">{m.practical}</td>
                      <td className="px-4 py-3.5 text-center font-bold text-slate-900">{total}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold" style={{ background: gbg, color: gfg }}>
                          {grade}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center font-semibold text-slate-700">{gp.toFixed(1)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
