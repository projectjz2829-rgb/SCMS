import { useState, useEffect, useMemo } from 'react'
import { Plus, Pin, Search, Pencil, Trash2, X, Loader2, Megaphone } from 'lucide-react'
import { announcementsApi, Announcement as Ann } from '../api/announcements'
import { useToast } from '../contexts/ToastContext'
import { EmptyState } from './ui/EmptyState'
import { SkeletonCard } from './ui/Skeleton'
import { useDebounce } from '../hooks/useDebounce'

const priorities = ['urgent', 'important', 'normal'] as const
const priorityStyle: Record<string, [string, string]> = {
  urgent: ['#FEF2F2', '#EF4444'],
  important: ['#FFFBEB', '#F59E0B'],
  normal: ['#F0FDF4', '#22C55E'],
}

function BroadcastModal({ ann, onClose, onSave }: { ann: Partial<Ann>; onClose: () => void; onSave: (a: Partial<Ann>) => void }) {
  const [form, setForm] = useState<Partial<Ann>>({
    title: '',
    message: '',
    priority: 'normal',
    pinned: false,
    active: true,
    expiry_date: '',
    ...ann
  })
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    if (!form.title || !form.message) return
    setLoading(true)
    await onSave(form)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[95vw] md:w-full md:max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#EFF6FF' }}>
              <Megaphone className="w-4 h-4" style={{ color: '#2563EB' }} />
            </div>
            <h2 className="text-base font-semibold text-slate-900">{ann.id ? 'Edit Announcement' : 'New Broadcast'}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 md:p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Announcement title..." className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none bg-slate-50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Message *</label>
            <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              rows={4} placeholder="Write your announcement..." className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none bg-slate-50 resize-none" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as any }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none bg-slate-50">
                {priorities.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Expiry Date</label>
              <input type="date" value={form.expiry_date || ''} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none bg-slate-50" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.pinned} onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))} className="w-4 h-4 rounded accent-blue-600" />
              <span className="text-sm text-slate-700">Pin announcement</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4 rounded accent-blue-600" />
              <span className="text-sm text-slate-700">Active</span>
            </label>
          </div>
        </div>
        <div className="px-4 md:px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-2">
          <button onClick={onClose} className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">Cancel</button>
          <button onClick={handleSend} disabled={loading || !form.title || !form.message}
            className="w-full sm:w-auto px-5 py-2 text-sm font-semibold text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}>
            {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...</> : (ann.id ? 'Save Changes' : 'Broadcast')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Announcements() {
  const [data, setData] = useState<Ann[]>([])
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [modal, setModal] = useState<{ open: boolean; ann: Partial<Ann> }>({ open: false, ann: {} })
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const { success, error } = useToast()

  useEffect(() => {
    loadAnnouncements()
  }, [])

  const loadAnnouncements = async () => {
    setLoading(true)
    try {
      const items = await announcementsApi.getAll()
      setData(items)
    } catch (e) {
      error('Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => data.filter(a =>
    !debouncedSearch || a.title.toLowerCase().includes(debouncedSearch.toLowerCase()) || a.message.toLowerCase().includes(debouncedSearch.toLowerCase())
  ), [data, debouncedSearch])

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    const pOrder: Record<string, number> = { urgent: 0, important: 1, normal: 2 }
    return (pOrder[a.priority] || 0) - (pOrder[b.priority] || 0)
  }), [filtered])

  const handleSave = async (form: Partial<Ann>) => {
    try {
      if (form.id) {
        await announcementsApi.update(form.id, form)
        success('Announcement updated')
      } else {
        await announcementsApi.create(form)
        success('Announcement broadcast!')
      }
      loadAnnouncements()
      setModal({ open: false, ann: {} })
    } catch (e) {
      error('Error saving announcement')
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await announcementsApi.delete(deleteId)
      success('Deleted')
      loadAnnouncements()
    } catch (e) {
      error('Error deleting announcement')
    }
    setDeleteId(null)
  }

  const togglePin = async (id: number) => {
    const ann = data.find(a => a.id === id)
    if (!ann) return
    try {
      await announcementsApi.update(id, { pinned: !ann.pinned })
      loadAnnouncements()
    } catch (e) {
      error('Error updating pin status')
    }
  }

  return (
    <div className="p-6 space-y-5 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Announcements</h1>
          <p className="text-slate-500 text-sm mt-0.5">{data.length} announcements • {data.filter(a => a.pinned).length} pinned</p>
        </div>
        <button onClick={() => setModal({ open: true, ann: {} })}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }}>
          <Plus className="w-4 h-4" /> New Broadcast
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search announcements..."
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white shadow-sm focus:outline-none" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <>
          {/* Pinned section */}
          {sorted.filter(a => a.pinned).length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Pin className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pinned</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sorted.filter(a => a.pinned).map(a => <AnnCard key={a.id} ann={a} onEdit={() => setModal({ open: true, ann: a })} onDelete={() => setDeleteId(a.id)} onTogglePin={() => togglePin(a.id)} />)}
          </div>
        </div>
      )}

      {/* All announcements */}
      {sorted.filter(a => !a.pinned).length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">All Announcements</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sorted.filter(a => !a.pinned).map(a => <AnnCard key={a.id} ann={a} onEdit={() => setModal({ open: true, ann: a })} onDelete={() => setDeleteId(a.id)} onTogglePin={() => togglePin(a.id)} />)}
          </div>
        </div>
      )}

      {sorted.length === 0 && (
        <EmptyState 
          icon={<Megaphone className="w-6 h-6" />}
          title="No announcements found" 
          description={search ? "No announcements match your search criteria." : "There are currently no broadcasts."}
        />
      )}
      </>
      )}

      {modal.open && <BroadcastModal ann={modal.ann} onClose={() => setModal({ open: false, ann: {} })} onSave={handleSave} />}

      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4"><Trash2 className="w-5 h-5 text-red-500" /></div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">Delete Announcement?</h3>
            <p className="text-sm text-slate-500 mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl">Cancel</button>
              <button onClick={handleDelete}
                className="flex-1 py-2 text-sm font-medium text-white bg-red-500 rounded-xl">Delete</button>
            </div>
          </div>
        </div>
      )}


    </div>
  )
}

function AnnCard({ ann, onEdit, onDelete, onTogglePin }: { ann: Ann; onEdit: () => void; onDelete: () => void; onTogglePin: () => void }) {
  const [pbg, pfg] = priorityStyle[ann.priority || 'normal'] || ['#F8FAFC', '#64748B']
  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 hover:shadow-md transition-all duration-200 flex flex-col gap-3 ${ann.pinned ? 'border-blue-100' : 'border-slate-100'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {ann.pinned && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                <Pin className="w-2.5 h-2.5" /> Pinned
              </span>
            )}
            <span className="px-2 py-0.5 rounded-lg text-xs font-semibold" style={{ background: pbg, color: pfg }}>
              {ann.priority}
            </span>
            {!ann.active && <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-400">Inactive</span>}
          </div>
          <h3 className="text-sm font-semibold text-slate-900 leading-snug">{ann.title}</h3>
        </div>
      </div>
      <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">{ann.message}</p>
      <div className="flex items-center justify-between pt-1 border-t border-slate-50">
        <div>
          <p className="text-xs text-slate-400">by {ann.creator_name || 'Admin'}</p>
          <p className="text-xs text-slate-400">{ann.created_at ? new Date(ann.created_at).toISOString().split('T')[0] : ''} {ann.expiry_date && `· expires ${ann.expiry_date}`}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onTogglePin} title={ann.pinned ? 'Unpin' : 'Pin'}
            className={`p-1.5 rounded-lg transition-colors ${ann.pinned ? 'text-blue-500 bg-blue-50' : 'text-slate-400 hover:text-blue-500 hover:bg-blue-50'}`}>
            <Pin className="w-3.5 h-3.5" />
          </button>
          <button onClick={onEdit} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={onDelete} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    </div>
  )
}
