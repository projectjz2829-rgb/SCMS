import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { reportsApi, TranscriptData } from '../api/reports'
import { Printer } from 'lucide-react'

export default function Transcript() {
  const { id } = useParams()
  const [data, setData] = useState<TranscriptData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      reportsApi.getTranscript(Number(id)).then(res => {
        setData(res.data)
        setLoading(false)
      }).catch(err => {
        console.error(err)
        setLoading(false)
      })
    }
  }, [id])

  if (loading) return <div className="p-10 text-center font-medium text-slate-500">Loading transcript...</div>
  if (!data) return <div className="p-10 text-center font-medium text-red-500">Failed to load transcript</div>

  return (
    <div className="bg-white min-h-screen">
      {/* Hide controls when printing */}
      <style>
        {`
          @media print {
            .no-print { display: none !important; }
            body { background: white; margin: 0; padding: 0; }
            @page { margin: 20mm; }
          }
        `}
      </style>

      {/* Control Bar (hidden on print) */}
      <div className="no-print bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center fixed top-0 w-full left-0 z-50">
        <div>
          <h1 className="font-bold text-slate-800">Transcript Preview</h1>
          <p className="text-xs text-slate-500">Ensure margins are set to default before printing</p>
        </div>
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <Printer className="w-4 h-4" /> Export to PDF / Print
        </button>
      </div>

      {/* Transcript Document */}
      <div className="max-w-4xl mx-auto pt-24 pb-12 px-4 sm:px-8 print:p-0">
        
        {/* Header */}
        <div className="text-center mb-8 sm:mb-10 pb-6 border-b-2 border-slate-800">
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-slate-900">Official Transcript</h1>
          <p className="text-xs sm:text-sm font-medium text-slate-600 uppercase tracking-widest mt-2">SCMS Academic Record</p>
        </div>

        {/* Student Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-8 sm:mb-10">
          <div className="space-y-3 text-sm">
            <div className="flex border-b border-slate-200 pb-2">
              <span className="w-28 sm:w-32 font-bold text-slate-600 uppercase text-xs tracking-wider">Student Name</span>
              <span className="font-semibold text-slate-900">{data.student.name}</span>
            </div>
            <div className="flex border-b border-slate-200 pb-2">
              <span className="w-28 sm:w-32 font-bold text-slate-600 uppercase text-xs tracking-wider">Roll Number</span>
              <span className="font-semibold text-slate-900">{data.student.roll_no}</span>
            </div>
            <div className="flex border-b border-slate-200 pb-2">
              <span className="w-28 sm:w-32 font-bold text-slate-600 uppercase text-xs tracking-wider">Email</span>
              <span className="font-semibold text-slate-900 break-all">{data.student.email}</span>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex border-b border-slate-200 pb-2">
              <span className="w-28 sm:w-32 font-bold text-slate-600 uppercase text-xs tracking-wider">Department</span>
              <span className="font-semibold text-slate-900">{data.student.dept}</span>
            </div>
            <div className="flex border-b border-slate-200 pb-2">
              <span className="w-28 sm:w-32 font-bold text-slate-600 uppercase text-xs tracking-wider">Year / Section</span>
              <span className="font-semibold text-slate-900">{data.student.year} / {data.student.section}</span>
            </div>
          </div>
        </div>

        {/* Marks Table */}
        <div className="mb-10">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4">Academic Record</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100 border-y-2 border-slate-800 text-slate-900">
                <th className="py-3 px-4 text-left font-bold w-24">Code</th>
                <th className="py-3 px-4 text-left font-bold">Course Title</th>
                <th className="py-3 px-4 text-center font-bold">Marks</th>
                <th className="py-3 px-4 text-center font-bold">Grade</th>
                <th className="py-3 px-4 text-center font-bold">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.courses.map(course => (
                <tr key={course.course_code}>
                  <td className="py-3 px-4 font-semibold text-slate-900">{course.course_code}</td>
                  <td className="py-3 px-4 text-slate-700">{course.course_name}</td>
                  <td className="py-3 px-4 text-center font-medium text-slate-900">{course.total} / 175</td>
                  <td className="py-3 px-4 text-center font-bold text-slate-900">{course.grade}</td>
                  <td className="py-3 px-4 text-center font-semibold text-slate-900">{course.grade_point.toFixed(1)}</td>
                </tr>
              ))}
              {data.courses.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 italic">No academic records found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="flex justify-end pt-6 border-t-2 border-slate-800">
          <div className="w-64 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="font-bold text-slate-600 uppercase tracking-wider text-xs">Total Courses</span>
              <span className="font-semibold text-slate-900">{data.academic.total_courses}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="font-bold text-slate-600 uppercase tracking-wider text-xs">Attendance</span>
              <span className="font-semibold text-slate-900">{data.academic.attendance_pct}%</span>
            </div>
            <div className="flex justify-between items-center text-lg mt-2 pt-2 border-t border-slate-200">
              <span className="font-black text-slate-900 uppercase tracking-wider text-sm">Overall GPA</span>
              <span className="font-black text-indigo-700">{data.academic.overall_gpa.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-slate-200 text-center flex justify-between items-center text-xs text-slate-500 font-medium">
          <p>Generated by SCMS — {new Date().toLocaleDateString()}</p>
          <p>End of Transcript</p>
        </div>

      </div>
    </div>
  )
}
