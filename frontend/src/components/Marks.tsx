import { useState, useEffect } from 'react'
import { Save, Loader2, CheckCircle, ChevronDown, FileSpreadsheet } from 'lucide-react'
import { coursesApi, Course } from '../api/courses'
import { marksApi, Marks as MarkRecord } from '../api/marks'
import { useToast } from '../contexts/ToastContext'
import { EmptyState } from './ui/EmptyState'
import { SkeletonTable } from './ui/Skeleton'

type MarkRow = {
  studentId: number
  name: string
  roll: string
  internal1: number
  internal2: number
  semester: number
  practical: number
  markId?: number
}

function calcTotal(r: MarkRow) { return r.internal1 + r.internal2 + r.semester + r.practical }
function calcGrade(total: number): [string, number] {
  const max_marks = 175;
  const pct = (total / max_marks) * 100;
  if (pct >= 90) return ['O', 10.0]
  if (pct >= 80) return ['A+', 9.0]
  if (pct >= 70) return ['A', 8.0]
  if (pct >= 60) return ['B+', 7.0]
  if (pct >= 50) return ['B', 6.0]
  return ['U', 0.0]
}

const initialRows = (courseStudents: any[], existingMarks: MarkRecord[]): MarkRow[] => {
  return courseStudents.map(s => {
    const ex = existingMarks.find(m => m.student_id === s.id)
    return {
      studentId: s.id,
      name: s.full_name,
      roll: s.roll_no,
      internal1: ex?.internal_1 || 0,
      internal2: ex?.internal_2 || 0,
      semester: ex?.semester_final || 0,
      practical: ex?.practical || 0,
      markId: ex?.id
    }
  })
}

export default function Marks() {
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null)
  const [rows, setRows] = useState<MarkRow[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const { success, error } = useToast()

  useEffect(() => {
    coursesApi.getAll().then(res => {
      const data = res.data;
      setCourses(data)
      if (data.length > 0) {
        setSelectedCourse(data[0].id!)
      }
    })
  }, [])

  useEffect(() => {
    if (selectedCourse) {
      setLoading(true)
      Promise.all([
        coursesApi.getStudents(selectedCourse),
        marksApi.getAll({ course_id: selectedCourse })
      ]).then(([students, marks]) => {
        setRows(initialRows(students, marks))
      }).catch(() => {
        error('Failed to load students')
      }).finally(() => {
        setLoading(false)
      })
    }
  }, [selectedCourse])

  const updateField = (studentId: number, field: keyof MarkRow, val: number) => {
    setRows(rs => rs.map(r => r.studentId === studentId ? { ...r, [field]: val } : r))
  }

  const handleDelete = async (markId: number) => {
    if (!window.confirm("Are you sure you want to delete this mark record?")) return
    setLoading(true)
    try {
      await marksApi.delete(markId)
      success('Mark deleted successfully')
      
      // Refresh list
      const [students, marks] = await Promise.all([
        coursesApi.getStudents(selectedCourse!),
        marksApi.getAll({ course_id: selectedCourse! })
      ])
      setRows(initialRows(students, marks))
    } catch (e) {
      console.error(e)
      error('Failed to delete mark')
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!selectedCourse) return
    setSaving(true)
    try {
      const year = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
      await Promise.all(rows.map(r => 
        marksApi.create({
          student_id: r.studentId,
          course_id: selectedCourse,
          academic_year: year,
          internal_1: r.internal1,
          internal_2: r.internal2,
          semester_final: r.semester,
          practical: r.practical
        })
      ))
      setSaved(true)
      success('Marks saved successfully')
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      console.error(e)
      error('Failed to save marks')
    } finally {
      setSaving(false)
    }
  }

  const maxMap: Record<string, number> = { internal1: 20, internal2: 20, semester: 50, practical: 25 }

  const gradeColor: Record<string, [string, string]> = {
    'O': ['#F0FDF4', '#22C55E'],
    'A+': ['#F0FDF4', '#22C55E'], 
    'A': ['#EFF6FF', '#2563EB'],
    'B+': ['#EFF6FF', '#2563EB'], 
    'B': ['#FFFBEB', '#F59E0B'],
    'U': ['#FEF2F2', '#EF4444'],
  }

  return (
    <div className="p-6 space-y-5 max-w-screen-xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Marks Entry</h1>
        <p className="text-slate-500 text-sm mt-0.5">Enter and manage student marks</p>
      </div>

      {/* Course selector */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col md:flex-row flex-wrap gap-4 items-start md:items-end">
        <div className="w-full md:flex-1 md:w-auto">
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Course</label>
          <div className="relative">
            <select value={selectedCourse || ''} onChange={e => setSelectedCourse(Number(e.target.value))}
              className="w-full pl-3 pr-8 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 appearance-none font-medium text-slate-900 focus:outline-none">
              {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <div className="w-full md:w-auto flex flex-wrap md:flex-nowrap items-center gap-2 sm:gap-3">
          {[['Int-1', '20'], ['Int-2', '20'], ['Semester', '50'], ['Practical', '25'], ['Total', '115']].map(([label, max]) => (
            <div key={label} className="flex-1 md:flex-none text-center px-2 sm:px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 min-w-[60px]">
              <p className="text-[10px] sm:text-xs font-semibold text-slate-700">{label}</p>
              <p className="text-[10px] sm:text-xs text-slate-400">Max: {max}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Marks table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                {[
                  { key: 'internal1', label: 'Internal 1', max: 20 },
                  { key: 'internal2', label: 'Internal 2', max: 20 },
                  { key: 'semester', label: 'Semester', max: 50 },
                  { key: 'practical', label: 'Practical', max: 25 },
                ].map(f => (
                  <th key={f.key} className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    {f.label} <span className="font-normal text-slate-400">/{f.max}</span>
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Grade</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">GPA</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-0">
                    <SkeletonTable rows={5} cols={8} />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-4">
                    <EmptyState 
                      icon={<FileSpreadsheet className="w-6 h-6" />}
                      title="No students found" 
                      description="There are no students enrolled in this course."
                    />
                  </td>
                </tr>
              ) : rows.map(r => {
                const total = calcTotal(r)
                const [grade, points] = calcGrade(total)
                const [gbg, gfg] = gradeColor[grade] || ['#F8FAFC', '#64748B']
                return (
                  <tr key={r.studentId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, #2563EB, #06B6D4)' }}>
                          {r.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 text-sm">{r.name}</p>
                          <p className="text-xs text-slate-400 font-mono">{r.roll}</p>
                        </div>
                      </div>
                    </td>
                    {(['internal1', 'internal2', 'semester', 'practical'] as const).map(field => (
                      <td key={field} className="px-4 py-3.5 text-center">
                        <input
                          type="number"
                          min={0}
                          max={maxMap[field]}
                          value={r[field]}
                          onChange={e => updateField(r.studentId, field, Math.min(maxMap[field], Math.max(0, Number(e.target.value))))}
                          className="w-16 text-center px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:border-transparent font-medium"
                        />
                      </td>
                    ))}
                    <td className="px-4 py-3.5 text-center font-bold text-slate-900">{total}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-lg text-xs font-bold" style={{ background: gbg, color: gfg }}>{grade}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center text-sm font-semibold text-slate-700">{points.toFixed(1)}</td>
                    <td className="px-4 py-3.5 text-right">
                      {r.markId && (
                        <button
                          onClick={() => handleDelete(r.markId!)}
                          className="px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white rounded-xl shadow-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
          style={{ background: saved ? 'linear-gradient(135deg, #22C55E, #16A34A)' : 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}>
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            : saved ? <><CheckCircle className="w-4 h-4" /> Marks Saved!</>
            : <><Save className="w-4 h-4" /> Save Marks</>}
        </button>
      </div>
    </div>
  )
}
