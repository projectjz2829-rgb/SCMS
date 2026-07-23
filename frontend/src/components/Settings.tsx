import { useState, useEffect } from 'react'
import { Bell, BellOff, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { settingsApi } from '../api/settings'

const tabs = ['Notifications', 'Security'] as const
type Tab = typeof tabs[number]

export default function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>('Notifications')
  const [notifs, setNotifs] = useState({
    announcements: true, marks: true, attendance: false, system: true, email: false,
  })
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })
  const [showPw, setShowPw] = useState({ current: false, newPw: false, confirm: false })
  const [saved, setSaved] = useState('')

  const showSaved = (msg: string) => { setSaved(msg); setTimeout(() => setSaved(''), 2500) }

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await settingsApi.getSettings()
        if (data && data.notifications) {
          setNotifs(data.notifications)
        }
      } catch {
        // settings load failed silently
      }
    }
    loadSettings()
  }, [])

  const saveNotifs = async () => {
    try {
      await settingsApi.updateSettings({ notifications: notifs })
      showSaved('Notification preferences saved')
    } catch {
      // save failed silently
    }
  }

  const handlePasswordUpdate = async () => {
    if (pwForm.newPw.length < 8) {
      showSaved('Password must be at least 8 characters')
      return
    }
    if (pwForm.newPw !== pwForm.confirm) {
      showSaved('Passwords do not match')
      return
    }
    try {
      await settingsApi.updatePassword(pwForm.current, pwForm.newPw)
      setPwForm({ current: '', newPw: '', confirm: '' })
      showSaved('Password updated successfully')
    } catch {
      showSaved('Failed to update password. Check current password.')
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your preferences and account security</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap sm:flex-nowrap gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-fit">
        {tabs.map(tab => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)}
            className={`flex-1 sm:flex-none px-3 sm:px-5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-150 ${
              activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Notifications */}
      {activeTab === 'Notifications' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Notification Preferences</h3>
          {[
            { key: 'announcements' as const, label: 'Announcements', desc: 'Get notified when new announcements are published' },
            { key: 'marks' as const, label: 'Marks & Results', desc: 'Alerts when marks are uploaded or updated' },
            { key: 'attendance' as const, label: 'Attendance', desc: 'Notifications for attendance marking' },
            { key: 'system' as const, label: 'System Updates', desc: 'Important system and maintenance notices' },
            { key: 'email' as const, label: 'Email Digest', desc: 'Receive a weekly email summary' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${notifs[key] ? 'text-blue-500' : 'text-slate-300'}`}>
                  {notifs[key] ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNotifs(n => ({ ...n, [key]: !n[key] }))}
                className={`relative w-11 h-6 rounded-full transition-all duration-200 ${notifs[key] ? '' : 'bg-slate-200'}`}
                style={notifs[key] ? { background: '#2563EB' } : {}}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${notifs[key] ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          ))}
          <button type="button" onClick={saveNotifs} className="mt-2 px-4 py-2 text-sm font-semibold text-white rounded-xl hover:opacity-90" style={{ background: '#2563EB' }}>
            Save Preferences
          </button>
        </div>
      )}

      {/* Security */}
      {activeTab === 'Security' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-50">
                <Lock className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Change Password</h3>
                <p className="text-xs text-slate-400">Use a strong password that's at least 8 characters</p>
              </div>
            </div>
            {[
              { key: 'current', label: 'Current Password' },
              { key: 'newPw', label: 'New Password' },
              { key: 'confirm', label: 'Confirm New Password' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
                <div className="relative">
                  <input
                    type={(showPw as Record<string, boolean>)[key] ? 'text' : 'password'}
                    value={(pwForm as Record<string, string>)[key]}
                    onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 pr-10 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none bg-slate-50"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(s => ({ ...s, [key]: !(s as Record<string, boolean>)[key] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {(showPw as Record<string, boolean>)[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={handlePasswordUpdate}
              disabled={!pwForm.current || !pwForm.newPw || pwForm.newPw !== pwForm.confirm || pwForm.newPw.length < 8}
              className="px-4 py-2 text-sm font-semibold text-white rounded-xl disabled:opacity-40 hover:opacity-90 transition-opacity"
              style={{ background: '#2563EB' }}>
              Update Password
            </button>
          </div>
        </div>
      )}

      {saved && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-slate-900 text-white text-sm rounded-xl shadow-xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-400" /> {saved}
        </div>
      )}
    </div>
  )
}
