import { useState, useEffect } from 'react'
import { Search, Plus, Eye, Pencil, Trash2, X, Users, BookOpen, Filter, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { coursesApi, Course } from '../api/courses'
import { facultyApi, Faculty } from '../api/faculty'
import { useToast } from '../contexts/ToastContext'
import { EmptyState } from './ui/EmptyState'
import { SkeletonTable } from './ui/Skeleton'
import { useDebounce } from '../hooks/useDebounce'
import { DEPARTMENTS } from '../utils/departments'

const semesters = [1, 2, 3, 4, 5, 6, 7, 8]

const deptColors: Record<string, [string, string]> = {
  'Computer Science': ['#EFF6FF', '#2563EB'],
  'Electrical Engineering': ['#ECFEFF', '#06B6D4'],
  'Mechanical Engineering': ['#F0FDF4', '#22C55E'],
  'Civil Engineering': ['#FFFBEB', '#F59E0B'],
  'Business Administration': ['#F5F3FF', '#8B5CF6'],
}

function Modal({ title, course, facultyList, onClose, onSave }: { title: string; course: Partial<Course>; facultyList: Faculty[]; onClose: () => void; onSave: (c: Partial<Course>) => Promise<void> }) {
  const [form, setForm] = useState(course)
  const [saving, setSaving] = useState(false)
  const set = (k: keyof Course, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          {[{ label: 'Course Code', key: 'code' }, { label: 'Course Name', key: 'name' }].map(({ label, key }) => (
            <div key={key} className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
              <input value={(form as Record<string, string | number>)[key] as string || ''} onChange={e => set(key as keyof Course, e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none bg-slate-50" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Department</label>
            <select value={form.dept || ''} onChange={e => set('dept', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none bg-slate-50">
              {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Semester</label>
            <select value={form.semester || 1} onChange={e => set('semester', Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none bg-slate-50">
              {semesters.map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Faculty</label>
            <select value={form.faculty_id || ''} onChange={e => set('faculty_id', Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none bg-slate-50"
              disabled={!form.dept || facultyList.filter(f => f.dept === form.dept).length === 0}
            >
              <option value="">
                {!form.dept ? 'Select Department First' : facultyList.filter(f => f.dept === form.dept).length === 0 ? 'No faculty available for this department' : 'Select Faculty'}
              </option>
              {facultyList.filter(f => f.dept === form.dept).map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}
            </select>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">Cancel</button>
          <button 
            disabled={saving}
            onClick={async () => {
              setSaving(true)
              await onSave(form)
              setSaving(false)
            }} 
            className="px-4 py-2 text-sm font-medium text-white rounded-xl flex items-center gap-2 disabled:opacity-50" 
            style={{ background: '#22C55E' }}>
            {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</> : 'Save Course'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Courses() {
  const [data, setData] = useState<Course[]>([])
  const [facultyList, setFacultyList] = useState<Faculty[]>([])
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [deptFilter, setDeptFilter] = useState('')
  const [semFilter, setSemFilter] = useState('')
  const [editModal, setEditModal] = useState<{ open: boolean; course: Partial<Course> | null; isNew: boolean }>({ open: false, course: null, isNew: false })
  const [viewCourse, setViewCourse] = useState<Course | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const { success, error } = useToast()

  const PER_PAGE = 8

  const loadData = async (initialLoad = true) => {
    if (initialLoad) setLoading(true)
    try {
      const [coursesRes, facultyRes] = await Promise.all([
        coursesApi.getAll({
          search: debouncedSearch,
          dept: deptFilter,
          semester: semFilter,
          page,
          limit: PER_PAGE
        }),
        facultyApi.getAll()
      ])
      setData(coursesRes.data)
      setTotalPages(coursesRes.meta?.pages || 1)
      setTotalItems(coursesRes.meta?.total || coursesRes.data.length)
      setFacultyList(facultyRes.data || facultyRes)
    } catch (e) {
      error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [debouncedSearch, deptFilter, semFilter, page])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, deptFilter, semFilter])

  const handleSave = async (form: Partial<Course>) => {
    try {
      if (editModal.isNew) {
        const payload: Record<string, any> = {
          name: form.name || '',
          code: form.code || '',
          dept: form.dept || '',
          semester: Number(form.semester) || 1,
        }
        if (form.faculty_id) payload.faculty_id = Number(form.faculty_id)
        await coursesApi.create(payload)
        success('Course created')
      } else {
        if (form.id) {
          const updatePayload: Record<string, any> = {
            name: form.name,
            dept: form.dept,
            semester: form.semester ? Number(form.semester) : undefined,
            faculty_id: form.faculty_id ? Number(form.faculty_id) : undefined
          }
          await coursesApi.update(form.id, updatePayload)
        }
        success('Course updated')
      }
      setEditModal({ open: false, course: null, isNew: false })
      loadData()
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to save course';
      error(msg);
    }
  }

  return (
    <div className="p-6 space-y-5 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Courses</h1>
          <p className="text-slate-500 text-sm mt-0.5">{totalItems} courses offered</p>
        </div>
        <button onClick={() => setEditModal({ open: true, course: { dept: DEPARTMENTS[0], semester: 1 }, isNew: true })}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #22C55E, #16A34A)', boxShadow: '0 2px 8px rgba(34,197,94,0.3)' }}>
          <Plus className="w-4 h-4" /> Add Course
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none" />
        </div>
        <Filter className="w-4 h-4 text-slate-400" />
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-700">
          <option value="">Department: All</option>
          {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
        </select>
        <select value={semFilter} onChange={e => setSemFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-700">
          <option value="">Semester: All</option>
          {semesters.map(s => <option key={s} value={s}>Semester {s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Code', 'Course Name', 'Department', 'Semester', 'Faculty', 'Students', 'Credits', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-0">
                    <SkeletonTable rows={5} cols={8} />
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-4">
                    <EmptyState 
                      icon={<BookOpen className="w-6 h-6" />}
                      title="No courses found" 
                      description={search || deptFilter || semFilter ? "No courses match your search criteria." : "Get started by adding a new course."}
                    />
                  </td>
                </tr>
              ) : data.map(c => {
                const [bg, fg] = deptColors[c.dept] || ['#F8FAFC', '#64748B']
                return (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors group">
                    <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-700">{c.code}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                          <BookOpen className="w-4 h-4" style={{ color: fg }} />
                        </div>
                        <span className="font-medium text-slate-900 whitespace-nowrap">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded-lg text-xs font-medium" style={{ background: bg, color: fg }}>{c.dept?.split(' ')[0]}</span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">Sem {c.semester}</td>
                    <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap">{c.faculty_name || '-'}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-700 font-medium">{c.enrolled_count || 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">3 cr</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setViewCourse(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setEditModal({ open: true, course: c, isNew: false })} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setDeleteId(c.id ?? null)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && data.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">Showing {Math.min((page - 1) * PER_PAGE + 1, totalItems)}–{Math.min(page * PER_PAGE, totalItems)} of {totalItems}</p>
            <div className="flex items-center gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${p === page ? 'text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                  style={p === page ? { background: '#2563EB' } : {}}>
                  {p}
                </button>
              ))}
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {editModal.open && editModal.course && (
        <Modal title={editModal.isNew ? 'Add Course' : 'Edit Course'} course={editModal.course} facultyList={facultyList}
          onClose={() => setEditModal({ open: false, course: null, isNew: false })} onSave={handleSave} />
      )}

      {viewCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setViewCourse(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-slate-900">Course Details</h2>
              <button onClick={() => setViewCourse(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: deptColors[viewCourse.dept]?.[0] || '#F8FAFC' }}>
                <BookOpen className="w-8 h-8" style={{ color: deptColors[viewCourse.dept]?.[1] || '#64748B' }} />
              </div>
              <div>
                <span className="font-mono text-xs font-bold text-slate-500">{viewCourse.code}</span>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">{viewCourse.name}</h3>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[['Department', viewCourse.dept], ['Semester', `Semester ${viewCourse.semester}`], ['Faculty', viewCourse.faculty_name || '-'], ['Credits', `3 credits`], ['Enrolled', `${viewCourse.enrolled_count || 0} students`]].map(([label, val]) => (
                <div key={label as string}>
                  <p className="text-xs text-slate-400 font-medium">{label}</p>
                  <p className="text-sm text-slate-800 font-medium mt-0.5">{val}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4"><Trash2 className="w-5 h-5 text-red-500" /></div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">Delete Course?</h3>
            <p className="text-sm text-slate-500 mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl">Cancel</button>
              <button onClick={() => {
                if (deleteId) {
                  coursesApi.delete(deleteId).then(() => {
                    success('Course removed')
                    loadData()
                  }).catch(() => {
                    error('Failed to remove course')
                  })
                }
                setDeleteId(null)
              }}
                className="flex-1 py-2 text-sm font-medium text-white bg-red-500 rounded-xl">Remove</button>
            </div>
          </div>
        </div>
      )}


    </div>
  )
}
