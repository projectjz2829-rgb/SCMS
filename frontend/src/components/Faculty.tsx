import { useState, useEffect } from 'react'
import { Search, Plus, Pencil, Trash2, X, Filter, Users, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { facultyApi, Faculty } from '../api/faculty'
import { useToast } from '../contexts/ToastContext'
import { EmptyState } from './ui/EmptyState'
import { SkeletonCard } from './ui/Skeleton'
import { useDebounce } from '../hooks/useDebounce'
import { DEPARTMENTS } from '../utils/departments'

const designations = ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer']

const deptColors: Record<string, [string, string]> = {
  'Computer Science': ['#EFF6FF', '#2563EB'],
  'Electrical Engineering': ['#ECFEFF', '#06B6D4'],
  'Mechanical Engineering': ['#F0FDF4', '#22C55E'],
  'Civil Engineering': ['#FFFBEB', '#F59E0B'],
  'Business Administration': ['#F5F3FF', '#8B5CF6'],
}

const desigColors: Record<string, [string, string]> = {
  'Professor': ['#FEF2F2', '#EF4444'],
  'Associate Professor': ['#FFFBEB', '#F59E0B'],
  'Assistant Professor': ['#F0FDF4', '#22C55E'],
  'Lecturer': ['#F8FAFC', '#64748B'],
}

function Modal({ title, fac, onClose, onSave }: { title: string; fac: Partial<Faculty>; onClose: () => void; onSave: (f: Partial<Faculty>) => Promise<void> }) {
  const [form, setForm] = useState(fac)
  const [saving, setSaving] = useState(false)
  const set = (k: keyof Faculty, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[95vw] md:w-full md:max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Employee ID', key: 'emp_id' },
            { label: 'Full Name', key: 'full_name' },
            { label: 'Phone', key: 'phone' },
            { label: 'Email', key: 'email' },
          ].map(({ label, key }) => (
            <div key={key} className="col-span-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
              <input value={(form as Record<string, string | number>)[key] as string || ''} onChange={e => set(key as keyof Faculty, e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none bg-slate-50" />
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
            <label className="block text-xs font-medium text-slate-600 mb-1">Designation</label>
            <select value={form.designation || ''} onChange={e => set('designation', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none bg-slate-50">
              {designations.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div className="px-4 md:px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-2">
          <button onClick={onClose} className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">Cancel</button>
          <button 
            disabled={saving}
            onClick={async () => {
              setSaving(true)
              await onSave(form)
              setSaving(false)
            }} 
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-50" 
            style={{ background: '#06B6D4' }}>
            {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</> : 'Save Faculty'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FacultyList() {
  const [data, setData] = useState<Faculty[]>([])
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [deptFilter, setDeptFilter] = useState('')
  const [desigFilter, setDesigFilter] = useState('')
  const [editModal, setEditModal] = useState<{ open: boolean; fac: Partial<Faculty> | null; isNew: boolean }>({ open: false, fac: null, isNew: false })
  const [viewModal, setViewModal] = useState<Faculty | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const { success, error } = useToast()

  const PER_PAGE = 8

  const loadFaculty = async () => {
    setLoading(true)
    try {
      const items = await facultyApi.getAll({
        search: debouncedSearch,
        dept: deptFilter,
        designation: desigFilter,
        page,
        limit: PER_PAGE
      })
      setData(items.data)
      setTotalPages(items.meta?.pages || 1)
      setTotalItems(items.meta?.total || items.data.length)
    } catch (e) {
      error('Failed to load faculty')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFaculty()
  }, [debouncedSearch, deptFilter, desigFilter, page])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, deptFilter, desigFilter])

  const handleSave = async (form: Partial<Faculty>) => {
    try {
      if (editModal.isNew) {
        // Only send fields the backend schema accepts
        const rawEmail = (form.email || '').trim()
        const validEmail = rawEmail.includes('@') ? rawEmail : `${(form.emp_id || 'FAC').toLowerCase()}@scms.edu`
        const payload: Record<string, string> = {
          emp_id: (form.emp_id || '').trim(),
          full_name: (form.full_name || '').trim(),
          dept: form.dept || '',
          designation: form.designation || 'Lecturer',
          email: validEmail,
          password: ((form.emp_id || 'FAC').trim()) + '@Scms1',
        }
        if (form.phone && form.phone.trim()) payload.phone = form.phone.trim()
        await facultyApi.create(payload)
        success('Faculty created successfully')
      } else if (form.id) {
        const updatePayload: Record<string, any> = {
          full_name: form.full_name,
          dept: form.dept,
          designation: form.designation,
          phone: form.phone?.trim()
        }
        await facultyApi.update(form.id, updatePayload)
        success('Faculty updated successfully')
      }
      setEditModal({ open: false, fac: null, isNew: false })
      loadFaculty()
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to save faculty';
      error(msg);
    }
  }

  return (
    <div className="p-6 space-y-5 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Faculty</h1>
          <p className="text-slate-500 text-sm mt-0.5">{totalItems} faculty members</p>
        </div>
        <button onClick={() => setEditModal({ open: true, fac: { dept: DEPARTMENTS[0], designation: designations[0] }, isNew: true })}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl shadow-sm transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #06B6D4, #0891B2)', boxShadow: '0 2px 8px rgba(6,182,212,0.3)' }}>
          <Plus className="w-4 h-4" /> Add Faculty
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col md:flex-row flex-wrap gap-3 items-center">
        <div className="relative w-full md:w-auto md:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search faculty..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none" />
        </div>
        <div className="hidden md:block">
          <Filter className="w-4 h-4 text-slate-400" />
        </div>
        <div className="w-full md:w-auto grid grid-cols-1 sm:grid-cols-2 md:flex gap-3">
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-700">
            <option value="">Department: All</option>
            {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
          </select>
          <select value={desigFilter} onChange={e => setDesigFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-700">
            <option value="">Designation: All</option>
            {designations.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : data.length === 0 ? (
        <EmptyState 
          icon={<Users className="w-6 h-6" />}
          title="No faculty found" 
          description={search || deptFilter || desigFilter ? "No faculty match your search criteria." : "Get started by adding a new faculty member."}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map(f => {
            const [dbg, dfg] = deptColors[f.dept] || ['#F8FAFC', '#64748B']
            const [sbg, sfg] = desigColors[f.designation] || ['#F8FAFC', '#64748B']
            return (
              <div key={f.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-10 bg-gradient-to-l from-white via-white to-transparent pl-8">
                  <button onClick={() => setEditModal({ open: true, fac: f, isNew: false })} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 bg-white/80 backdrop-blur" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setDeleteId(f.id ?? null)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 bg-white/80 backdrop-blur" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <div className="flex items-start gap-4 cursor-pointer" onClick={() => setViewModal(f)}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-base font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)' }}>
                    {f.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                  </div>
                  <div className="flex-1 min-w-0 pr-8">
                    <h3 className="text-base font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">{f.full_name}</h3>
                    <p className="text-sm text-slate-500 font-mono mt-0.5">{f.emp_id}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: dbg, color: dfg }}>{f.dept}</span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-100" style={{ background: sbg, color: sfg }}>{f.designation}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && data.length > 0 && (
        <div className="px-4 py-3 flex items-center justify-between bg-white rounded-2xl border border-slate-100 shadow-sm mt-4">
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

      {editModal.open && editModal.fac && (
        <Modal title={editModal.isNew ? 'Add Faculty' : 'Edit Faculty'} fac={editModal.fac} onClose={() => setEditModal({ open: false, fac: null, isNew: false })} onSave={handleSave} />
      )}

      {viewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setViewModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-[95vw] md:w-full md:max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">Faculty Profile</h2>
              <button onClick={() => setViewModal(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold" style={{ background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)' }}>
                  {viewModal.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{viewModal.full_name}</h3>
                  <p className="text-sm text-slate-500">{viewModal.emp_id}</p>
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { label: 'Department', value: viewModal.dept },
                  { label: 'Designation', value: viewModal.designation },
                  { label: 'Phone', value: viewModal.phone },
                  { label: 'Email', value: viewModal.email }
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-xs text-slate-400 font-medium">{item.label}</p>
                    <p className="text-sm text-slate-800 font-medium">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4"><Trash2 className="w-5 h-5 text-red-500" /></div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">Remove Faculty Member?</h3>
            <p className="text-sm text-slate-500 mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl">Cancel</button>
              <button onClick={() => {
                if (deleteId) {
                  facultyApi.delete(deleteId).then(() => {
                    success('Faculty removed')
                    loadFaculty()
                  }).catch(() => {
                    error('Failed to remove faculty')
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
