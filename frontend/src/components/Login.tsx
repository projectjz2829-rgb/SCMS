import { useState } from 'react'
import { Eye, EyeOff, Loader2, GraduationCap } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'

export type Role = 'admin' | 'faculty' | 'student'

interface Props {
  onLogin: (role: Role) => void
}

const accounts = [
  { role: 'admin' as Role, label: 'System Admin', color: '#2563EB' },
  { role: 'faculty' as Role, label: 'Faculty', color: '#06B6D4' },
  { role: 'student' as Role, label: 'Student', color: '#22C55E' },
]

export default function Login({ onLogin }: Props) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedRole, setSelectedRole] = useState<Role>('admin')

  const handleRoleSelect = (acc: typeof accounts[0]) => {
    setSelectedRole(acc.role)
    setEmail('')
    setPassword('')
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { setError('Please fill in all fields.'); return }
    setError('')
    setLoading(true)
    try {
      await login({ identifier: email, password })
      // Navigate to the dashboard or original requested page
      const from = (location.state as any)?.from?.pathname || '/'
      navigate(from, { replace: true })
      onLogin(selectedRole)
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen dot-bg flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 50%, #F0FDF4 100%)' }}>
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #2563EB, transparent)' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #06B6D4, transparent)' }} />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo + header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg shadow-blue-200" style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}>
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">SCMS Portal</h1>
          <p className="text-slate-500 text-sm mt-1">Smart Campus Management System</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl shadow-xl shadow-slate-200/60 p-8">
          {/* Demo role tabs */}
          <div className="mb-6">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Sign in as</p>
            <div className="grid grid-cols-3 gap-2">
              {accounts.map(acc => (
                <button
                  key={acc.role}
                  onClick={() => handleRoleSelect(acc)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all duration-200 ${selectedRole === acc.role
                    ? 'text-white border-transparent shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  style={selectedRole === acc.role ? { background: acc.color, borderColor: acc.color } : {}}
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email / ID */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Required Id</label>
              <input
                id="email"
                name="email"
                type="text"
                autoComplete="username"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/80 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': '#2563EB' } as React.CSSProperties}
                placeholder="Enter your ID"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 pr-11 rounded-xl border border-slate-200 bg-white/80 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember + forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 accent-blue-600"
                />
                <span className="text-sm text-slate-600">Remember me</span>
              </label>
              <button type="button" className="text-sm font-medium" style={{ color: '#2563EB' }}>
                Forgot password?
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-70"
              style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', boxShadow: '0 4px 14px rgba(37,99,235,0.4)' }}
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © 2025 SCMS • Smart Campus Management System
        </p>
      </div>
    </div>
  )
}
