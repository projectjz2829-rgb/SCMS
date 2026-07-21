import { useState, useEffect } from 'react'
import { Search, Plus, Eye, Pencil, Trash2, X, ChevronLeft, ChevronRight, Filter, Loader2, Users } from 'lucide-react'
import { studentsApi, Student } from '../api/students'
import { useToast } from '../contexts/ToastContext'
import { EmptyState } from './ui/EmptyState'
import { SkeletonTable } from './ui/Skeleton'
import { useDebounce } from '../hooks/useDebounce'
import { DEPARTMENTS } from '../utils/departments'

const years = [1, 2, 3, 4]
const sections = ['A', 'B', 'C']

function Badge({ children, color = 'blue' }: { children: React.ReactNode; color?: string }) {
  const colorMap: Record<string, [string, string]> = {
    blue: ['#EFF6FF', '#2563EB'], cyan: ['#ECFEFF', '#06B6D4'], green: ['#F0FDF4', '#22C55E'],
    yellow: ['#FFFBEB', '#F59E0B'], purple: ['#F5F3FF', '#8B5CF6'], slate: ['#F8FAFC', '#64748B'],
  }
  const [bg, fg] = colorMap[color] || colorMap.blue
  return (
    <span className="px-2 py-0.5 rounded-lg text-xs font-medium" style={{ background: bg, color: fg }}>{children}</span>
  )
}

const deptColors: Record<string, string> = {
  'Computer Science': 'blue', 'Electrical Engineering': 'cyan',
  'Mechanical Engineering': 'green', 'Civil Engineering': 'yellow', 'Business Administration': 'purple',
}

function Modal({ title, student, onClose, onSave }: { title: string; student: Partial<Student>; onClose: () => void; onSave: (s: Partial<Student>) => Promise<void> }) {
  const [form, setForm] = useState(student)
  const [saving, setSaving] = useState(false)
  const set = (k: keyof Student, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[95vw] md:w-full md:max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Roll Number', key: 'roll_no', type: 'text' },
            { label: 'Full Name', key: 'full_name', type: 'text' },
            { label: 'Phone', key: 'phone', type: 'tel' },
            { label: 'Email', key: 'email', type: 'email' },
          ].map(({ label, key, type }) => (
            <div key={key} className="col-span-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
              <input
                type={type}
                value={(form as Record<string, string | number>)[key] as string || ''}
                onChange={e => set(key as keyof Student, e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50"
              />
            </div>
          ))}
          <div className="col-span-1">
            <label className="block text-xs font-medium text-slate-600 mb-1">Department</label>
            <select value={form.dept || ''} onChange={e => set('dept', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none bg-slate-50">
              {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-medium text-slate-600 mb-1">Year</label>
            <select value={form.year || 1} onChange={e => set('year', Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none bg-slate-50">
              {years.map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-medium text-slate-600 mb-1">Section</label>
            <select value={form.section || 'A'} onChange={e => set('section', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none bg-slate-50">
              {sections.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="px-4 md:px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-2">
          <button onClick={onClose} className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
          <button 
            disabled={saving}
            onClick={async () => {
              setSaving(true)
              await onSave(form)
              setSaving(false)
            }} 
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50" 
            style={{ background: '#2563EB' }}>
            {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</> : 'Save Student'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ViewModal({ student, onClose }: { student: Student; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[95vw] md:w-full md:max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Student Profile</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold" style={{ background: 'linear-gradient(135deg, #2563EB, #06B6D4)' }}>
              {student.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{student.full_name}</h3>
              <p className="text-sm text-slate-500">{student.roll_no}</p>
              <Badge color={deptColors[student.dept] || 'blue'}>{student.dept}</Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Year', `Year ${student.year}`],
              ['Section', `Section ${student.section}`],
              ['GPA', (student.gpa || 0).toFixed(1)],
              ['Phone', student.phone],
              ['Email', student.email],
            ].map(([label, value]) => (
              <div key={label} className={label === 'Email' ? 'col-span-2' : ''}>
                <p className="text-xs text-slate-400 font-medium">{label}</p>
                <p className="text-sm text-slate-800 font-medium mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const PER_PAGE = 8

export default function Students() {
  const [data, setData] = useState<Student[]>([])
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [deptFilter, setDeptFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [sectionFilter, setSectionFilter] = useState('')
  const [page, setPage] = useState(1)
  const [editModal, setEditModal] = useState<{ open: boolean; student: Partial<Student> | null; isNew: boolean }>({ open: false, student: null, isNew: false })
  const [viewModal, setViewModal] = useState<Student | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const { success, error } = useToast()

  const loadStudents = async () => {
    setLoading(true)
    try {
      const items = await studentsApi.getAll({
        search: debouncedSearch,
        dept: deptFilter,
        year: yearFilter,
        section: sectionFilter,
        page,
        limit: PER_PAGE
      })
      setData(items.data)
      setTotalPages(items.meta?.pages || 1)
      setTotalItems(items.meta?.total || items.data.length)
    } catch (e) {
      error('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStudents()
  }, [debouncedSearch, deptFilter, yearFilter, sectionFilter, page])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, deptFilter, yearFilter, sectionFilter])

  const handleSave = async (form: Partial<Student>) => {
    try {
      if (editModal.isNew) {
        // Only send fields the backend schema accepts
        const payload: Record<string, any> = {
          roll_no: form.roll_no || '',
          full_name: form.full_name || '',
          dept: form.dept || '',
          year: Number(form.year) || 1,
          section: form.section || '',
          email: form.email || '',
          password: (form.roll_no || 'STU') + '@Scms1',
        }
        if (form.phone && form.phone.trim()) payload.phone = form.phone.trim()
        await studentsApi.create(payload)
        success('Student created successfully')
      } else if (form.id) {
        const updatePayload: Record<string, any> = {
          full_name: form.full_name,
          dept: form.dept,
          year: form.year ? Number(form.year) : undefined,
          section: form.section,
          phone: form.phone?.trim()
        }
        await studentsApi.update(form.id, updatePayload)
        success('Student updated successfully')
      }
      setEditModal({ open: false, student: null, isNew: false })
      loadStudents()
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to save student';
      error(msg);
    }
  }

  return (
    <div className="p-6 space-y-5 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Students</h1>
          <p className="text-slate-500 text-sm mt-0.5">{totalItems} students enrolled</p>
        </div>
        <button
          onClick={() => setEditModal({ open: true, student: { dept: DEPARTMENTS[0], year: 1, section: 'A' }, isNew: true })}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl shadow-sm transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }}
        >
          <Plus className="w-4 h-4" /> Add Student
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col md:flex-row flex-wrap gap-3 items-center">
        <div className="relative w-full md:w-auto md:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search name or roll number..." className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none" />
        </div>
        <div className="hidden md:block">
          <Filter className="w-4 h-4 text-slate-400" />
        </div>
        <div className="w-full md:w-auto grid grid-cols-1 sm:grid-cols-3 md:flex gap-3">
          {[
            { val: deptFilter, set: setDeptFilter, opts: DEPARTMENTS, placeholder: 'Department' },
            { val: yearFilter, set: setYearFilter, opts: years.map(String), placeholder: 'Year' },
            { val: sectionFilter, set: setSectionFilter, opts: sections, placeholder: 'Section' },
          ].map(({ val, set, opts, placeholder }) => (
            <select key={placeholder} value={val} onChange={e => { set(e.target.value); setPage(1) }}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none text-slate-700">
              <option value="">{placeholder}: All</option>
              {opts.map(o => <option key={o}>{o}</option>)}
            </select>
          ))}
        </div>
        {(search || deptFilter || yearFilter || sectionFilter) && (
          <button onClick={() => { setSearch(''); setDeptFilter(''); setYearFilter(''); setSectionFilter(''); setPage(1) }}
            className="w-full md:w-auto px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 bg-slate-100 rounded-xl">
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Roll No.', 'Name', 'Department', 'Year', 'Section', 'Phone', 'Email', 'Actions'].map(h => (
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
                      icon={<Users className="w-6 h-6" />}
                      title="No students found" 
                      description={search || deptFilter ? "No students match your search criteria." : "Get started by adding a new student."}
                    />
                  </td>
                </tr>
              ) : data.map(s => (
                <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors group">
                  <td className="px-4 py-3.5 font-mono text-xs text-slate-600 whitespace-nowrap">{s.roll_no}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, #2563EB, #06B6D4)' }}>
                        {s.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                      </div>
                      <span className="font-medium text-slate-900 whitespace-nowrap">{s.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5"><Badge color={deptColors[s.dept] || 'blue'}>{s.dept?.split(' ')[0]}</Badge></td>
                  <td className="px-4 py-3.5 text-slate-600">Year {s.year}</td>
                  <td className="px-4 py-3.5 text-slate-600">Sec {s.section}</td>
                  <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{s.phone}</td>
                  <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">{s.email}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setViewModal(s)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="View"><Eye className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setEditModal({ open: true, student: s, isNew: false })} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteId(s.id ?? null)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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
      </div>

      {/* Edit/Add Modal */}
      {editModal.open && editModal.student && (
        <Modal
          title={editModal.isNew ? 'Add New Student' : 'Edit Student'}
          student={editModal.student}
          onClose={() => setEditModal({ open: false, student: null, isNew: false })}
          onSave={handleSave}
        />
      )}

      {/* View Modal */}
      {viewModal && <ViewModal student={viewModal} onClose={() => setViewModal(null)} />}

      {/* Delete confirm */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">Remove Student?</h3>
            <p className="text-sm text-slate-500 mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={() => {
                if (deleteId) {
                  studentsApi.delete(deleteId).then(() => {
                    success('Student deleted')
                    loadStudents()
                  }).catch(() => {
                    error('Failed to delete student')
                  })
                }
                setDeleteId(null)
              }} className="flex-1 py-2 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors">Remove</button>
            </div>
          </div>
        </div>
      )}


    </div>
  )
}
