import { useState } from 'react'
import { Camera, Pencil, Save, X, CheckCircle } from 'lucide-react'
type Role = 'admin' | 'faculty' | 'student'

interface Props {
  role: Role
}

const profileData: Record<Role, {
  name: string; phone: string; email: string; photo: string;
  readonly: Record<string, string>;
  avatar: string; color: string;
}> = {
  admin: {
    name: 'System Administrator', phone: '+92-300-0000000', email: 'admin@scms.edu', photo: '', avatar: 'SA', color: '#2563EB',
    readonly: { Role: 'System Admin', 'Employee ID': 'ADM-001', Department: 'Administration', 'Joined': '2020-01-15' },
  },
  faculty: {
    name: 'Dr. Asad Raza', phone: '+92-300-9876543', email: 'asad.raza@scms.edu', photo: '', avatar: 'AR', color: '#06B6D4',
    readonly: { 'Employee ID': 'FAC-001', Department: 'Computer Science', Designation: 'Professor', Experience: '12 years', Joined: '2012-08-01' },
  },
  student: {
    name: 'Aisha Malik', phone: '+92-300-1234567', email: 'aisha.malik@scms.edu', photo: '', avatar: 'AM', color: '#22C55E',
    readonly: { 'Roll Number': 'CS-2024-001', Department: 'Computer Science', Year: 'Year 3', Section: 'Section A', CGPA: '3.80' },
  },
}

export default function Profile({ role }: Props) {
  const base = profileData[role]
  const [form, setForm] = useState({ name: base.name, phone: base.phone, email: base.email })
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleCancel = () => {
    setForm({ name: base.name, phone: base.phone, email: base.email })
    setEditing(false)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your personal information</p>
      </div>

      {/* Avatar card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg"
              style={{ background: `linear-gradient(135deg, ${base.color}, ${base.color}cc)` }}>
              {base.avatar}
            </div>
            {editing && (
              <button className="absolute -bottom-2 -right-2 w-7 h-7 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors">
                <Camera className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{form.name}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{form.email}</p>
            <span className="inline-flex mt-2 px-2.5 py-0.5 rounded-lg text-xs font-semibold text-white" style={{ background: base.color }}>
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </span>
          </div>
          <div className="ml-auto">
            {!editing ? (
              <button onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors">
                <Pencil className="w-3.5 h-3.5" /> Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={handleCancel} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
                <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white rounded-xl transition-opacity hover:opacity-90" style={{ background: base.color }}>
                  <Save className="w-3.5 h-3.5" /> Save
                </button>
              </div>
            )}
          </div>
        </div>

        {saved && (
          <div className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: '#F0FDF4' }}>
            <CheckCircle className="w-4 h-4" style={{ color: '#22C55E' }} />
            <span className="text-sm font-medium" style={{ color: '#22C55E' }}>Profile saved successfully</span>
          </div>
        )}
      </div>

      {/* Editable fields */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <h3 className="text-sm font-semibold text-slate-900">Personal Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {[
            { label: 'Full Name', key: 'name', type: 'text' },
            { label: 'Phone Number', key: 'phone', type: 'tel' },
            { label: 'Email Address', key: 'email', type: 'email' },
          ].map(({ label, key, type }) => (
            <div key={key} className={key === 'email' ? 'sm:col-span-2' : ''}>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
              {editing ? (
                <input
                  type={type}
                  value={(form as Record<string, string>)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 bg-slate-50 text-slate-900"
                />
              ) : (
                <p className="text-sm font-medium text-slate-800 py-2.5 px-3 bg-slate-50 rounded-xl border border-slate-100">
                  {(form as Record<string, string>)[key]}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Read-only fields */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <h3 className="text-sm font-semibold text-slate-900">Academic Information <span className="text-xs font-normal text-slate-400 ml-1">(read-only)</span></h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Object.entries(base.readonly).map(([label, value]) => (
            <div key={label} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs text-slate-400 font-medium mb-0.5">{label}</p>
              <p className="text-sm font-semibold text-slate-800">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
