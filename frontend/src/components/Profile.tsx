import { useState, useEffect, useRef } from 'react'
import { Camera, Pencil, Save, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { studentsApi, Student } from '../api/students'
import { facultyApi, Faculty } from '../api/faculty'

interface EditableFields {
  full_name: string
  phone: string
}

interface ReadonlyField {
  label: string
  value: string
}

function buildReadonly(role: string, profile: Student | Faculty | null): ReadonlyField[] {
  if (!profile) return []
  if (role === 'student') {
    const s = profile as Student
    return [
      { label: 'Roll Number', value: s.roll_no },
      { label: 'Department', value: s.dept },
      { label: 'Year', value: `Year ${s.year}` },
      { label: 'Section', value: `Section ${s.section}` },
    ]
  }
  if (role === 'faculty') {
    const f = profile as Faculty
    return [
      { label: 'Employee ID', value: f.emp_id },
      { label: 'Department', value: f.dept },
      { label: 'Designation', value: f.designation },
    ]
  }
  return [{ label: 'Role', value: 'Administrator' }]
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const roleColors: Record<string, string> = {
  admin: '#2563EB',
  faculty: '#06B6D4',
  student: '#22C55E',
}

export default function Profile() {
  const { user, role } = useAuth()
  const { success, error } = useToast()

  const [profile, setProfile] = useState<Student | Faculty | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<EditableFields>({ full_name: '', phone: '' })
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    if (!user || !role) {
      setLoading(false)
      return
    }

    setLoading(true)

    const profileId = user.profile?.id as number | undefined

    const fetch =
      role === 'student' && profileId
        ? studentsApi.getById(profileId)
        : role === 'faculty' && profileId
        ? facultyApi.getById(profileId)
        : Promise.resolve(null)

    fetch
      .then(data => {
        setProfile(data)
        if (data) {
          setForm({
            full_name: (data as Student | Faculty).full_name ?? '',
            phone: (data as Student & Faculty).phone ?? '',
          })
        }
      })
      .catch(() => error('Failed to load profile'))
      .finally(() => setLoading(false))

    return () => { abortRef.current?.abort() }
  }, [user, role])

  const handleSave = async () => {
    if (!profile || !role) return
    const profileId = (profile as Student).id ?? (profile as Faculty).id
    if (!profileId) return
    setSaving(true)
    try {
      if (role === 'student') {
        const updated = await studentsApi.update(profileId, {
          full_name: form.full_name,
          phone: form.phone,
        })
        setProfile(updated)
        setForm({ full_name: updated.full_name, phone: updated.phone ?? '' })
      } else if (role === 'faculty') {
        const updated = await facultyApi.update(profileId, {
          full_name: form.full_name,
          phone: form.phone,
        })
        setProfile(updated)
        setForm({ full_name: updated.full_name, phone: (updated as Faculty & { phone?: string }).phone ?? '' })
      }
      setEditing(false)
      success('Profile updated successfully')
    } catch {
      error('Failed to update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (profile) {
      setForm({
        full_name: (profile as Student | Faculty).full_name ?? '',
        phone: (profile as Student & Faculty).phone ?? '',
      })
    }
    setEditing(false)
  }

  const displayName = form.full_name || user?.email || 'User'
  const color = roleColors[role ?? 'admin'] ?? '#2563EB'
  const readonly = buildReadonly(role ?? '', profile)
  const email = user?.email ?? ''

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-100 rounded-xl w-48" />
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex gap-5">
              <div className="w-20 h-20 rounded-2xl bg-slate-100" />
              <div className="flex-1 space-y-2 pt-2">
                <div className="h-4 bg-slate-100 rounded w-40" />
                <div className="h-3 bg-slate-100 rounded w-24" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your personal information</p>
      </div>

      {/* Avatar card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="relative">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
            >
              {getInitials(displayName)}
            </div>
            {editing && (
              <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors">
                <Camera className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="text-center sm:text-left flex-1">
            <p className="text-lg font-bold text-slate-900">{displayName}</p>
            <p className="text-sm text-slate-400 mt-0.5">{email}</p>
            <span
              className="inline-block mt-2 px-3 py-1 text-xs font-semibold rounded-full capitalize"
              style={{ background: `${color}18`, color }}
            >
              {role}
            </span>
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <Pencil className="w-4 h-4" /> Edit
            </button>
          )}
        </div>
      </div>

      {/* Editable fields */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">Personal Information</h3>

        {/* Full name */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Full Name</label>
          {editing ? (
            <input
              type="text"
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          ) : (
            <p className="text-sm font-medium text-slate-900">{form.full_name || '—'}</p>
          )}
        </div>

        {/* Email — always readonly */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Email</label>
          <p className="text-sm font-medium text-slate-900">{email}</p>
        </div>

        {/* Phone */}
        {role !== 'admin' && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Phone</label>
            {editing ? (
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            ) : (
              <p className="text-sm font-medium text-slate-900">{form.phone || '—'}</p>
            )}
          </div>
        )}

        {/* Readonly role-specific fields */}
        {readonly.map(field => (
          <div key={field.label}>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">{field.label}</label>
            <p className="text-sm font-medium text-slate-900">{field.value || '—'}</p>
          </div>
        ))}

        {/* Save / Cancel */}
        {editing && (
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
              style={{ background: '#2563EB' }}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-60"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
