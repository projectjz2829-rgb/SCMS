import { useState, useEffect } from 'react'
import { coursesApi, Course } from '../api/courses'
import { reportsApi, ReportStudent } from '../api/reports'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'
import { FileSpreadsheet, Download, FileText, ExternalLink, ChevronDown, Search } from 'lucide-react'
import { useDebounce } from '../hooks/useDebounce'

export default function Reports() {
  const { role } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [students, setStudents] = useState<ReportStudent[]>([])
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null)
  const [studentSearch, setStudentSearch] = useState('')
  const debouncedSearch = useDebounce(studentSearch, 300)
  const [downloading, setDownloading] = useState<'attendance' | 'marks' | null>(null)

  const { success, error } = useToast()

  // Only admin and faculty can access reports — students see nothing here
  const canDownload = role === 'admin' || role === 'faculty'
  const canSearchTranscripts = role === 'admin' || role === 'faculty'

  useEffect(() => {
    if (!canDownload) return
    coursesApi.getAll().then(res => {
      setCourses(res.data)
      if (res.data.length > 0) setSelectedCourse(res.data[0].id!)
    }).catch(() => error('Failed to load courses'))
  }, [canDownload])

  useEffect(() => {
    if (!canSearchTranscripts) return
    reportsApi.getStudentsForReports(debouncedSearch || undefined)
      .then(setStudents)
      .catch(() => {})
  }, [debouncedSearch, canSearchTranscripts])

  const handleDownloadCsv = async (type: 'attendance' | 'marks') => {
    if (!selectedCourse) return
    setDownloading(type)
    try {
      const blob = type === 'attendance'
        ? await reportsApi.downloadAttendanceCsv(selectedCourse)
        : await reportsApi.downloadMarksCsv(selectedCourse)

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}_report_${selectedCourse}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
      success(`${type === 'attendance' ? 'Attendance' : 'Marks'} CSV downloaded`)
    } catch (e) {
      error(`Failed to download ${type} CSV`)
    } finally {
      setDownloading(null)
    }
  }

  if (!canDownload) {
    return (
      <div className="p-6 max-w-screen-xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-slate-500 text-sm mt-0.5">You do not have permission to access reports.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-slate-500 text-sm mt-0.5">Generate and download academic reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Course Reports */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Course Reports</h2>
              <p className="text-xs text-slate-500">Download CSV exports</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Select Course</label>
              <div className="relative">
                <select value={selectedCourse || ''} onChange={e => setSelectedCourse(Number(e.target.value))}
                  className="w-full pl-3 pr-8 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 appearance-none font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                  {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => handleDownloadCsv('attendance')}
                disabled={!selectedCourse || downloading === 'attendance'}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" /> Attendance CSV
              </button>
              <button
                onClick={() => handleDownloadCsv('marks')}
                disabled={!selectedCourse || downloading === 'marks'}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" /> Marks CSV
              </button>
            </div>
          </div>
        </div>

        {/* Student Transcripts — admin and faculty only */}
        {canSearchTranscripts && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">Student Transcripts</h2>
                <p className="text-xs text-slate-500">Generate printable PDF transcripts</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Search Student</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    placeholder="Search by name or roll number..."
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                {students.length > 0 ? (
                  <ul className="divide-y divide-slate-100">
                    {students.map(student => (
                      <li key={student.id} className="flex items-center justify-between p-3 hover:bg-slate-100/50 transition-colors">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{student.full_name}</p>
                          <p className="text-xs text-slate-500">{student.roll_no}</p>
                        </div>
                        <a
                          href={`/reports/transcript/${student.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Transcript
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-4 text-center text-sm text-slate-500">
                    {studentSearch ? 'No students found' : 'Type to search students'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
