import { useState, useEffect } from 'react'
import { Activity as ActivityIcon, UserPlus, BookOpen, Megaphone, CheckCircle, FileText, Edit, UserCheck, PlusCircle, Trash2 } from 'lucide-react'
import { activitiesApi, Activity as ActivityModel } from '../api/activities'

const iconMap: Record<string, React.ReactNode> = {
  'user-plus': <UserPlus className="w-4 h-4" />,
  'book-open': <BookOpen className="w-4 h-4" />,
  'megaphone': <Megaphone className="w-4 h-4" />,
  'check-circle': <CheckCircle className="w-4 h-4" />,
  'file-text': <FileText className="w-4 h-4" />,
  'edit': <Edit className="w-4 h-4" />,
  'user-check': <UserCheck className="w-4 h-4" />,
  'plus-circle': <PlusCircle className="w-4 h-4" />,
  'trash-2': <Trash2 className="w-4 h-4" />,
}

const typeColors: Record<string, [string, string]> = {
  'user-plus': ['#EFF6FF', '#2563EB'],
  'book-open': ['#F5F3FF', '#8B5CF6'],
  'megaphone': ['#ECFEFF', '#06B6D4'],
  'check-circle': ['#F0FDF4', '#22C55E'],
  'file-text': ['#FFFBEB', '#F59E0B'],
  'edit': ['#FFFBEB', '#F59E0B'],
  'user-check': ['#ECFEFF', '#06B6D4'],
  'plus-circle': ['#EFF6FF', '#2563EB'],
  'trash-2': ['#FEF2F2', '#EF4444'],
}

function formatTime(ts: string) {
  const d = new Date(ts)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatDate(ts: string) {
  const d = new Date(ts)
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function groupByDate(items: ActivityModel[]) {
  const groups: Record<string, ActivityModel[]> = {}
  items.forEach(a => {
    const date = a.timestamp.split('T')[0]
    if (!groups[date]) groups[date] = []
    groups[date].push(a)
  })
  return groups
}

export default function Activity() {
  const [activities, setActivities] = useState<ActivityModel[]>([])

  useEffect(() => {
    activitiesApi.getAll().then(setActivities).catch(console.error)
  }, [])

  const grouped = groupByDate(activities)
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Activity Feed</h1>
          <p className="text-slate-500 text-sm mt-0.5">All system activity, newest first</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm">
          <ActivityIcon className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-600 font-medium">{activities.length} events</span>
        </div>
      </div>

      <div className="max-w-2xl space-y-8">
        {dates.map(date => (
          <div key={date}>
            {/* Date header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">
                {formatDate(date + 'T00:00:00')}
              </span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>

            {/* Timeline */}
            <div className="relative">
              <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-100" />
              <div className="space-y-2">
                {grouped[date].map((act) => {
                  const [bg, fg] = typeColors[act.icon] || ['#F8FAFC', '#64748B']
                  return (
                    <div key={act.id} className="relative flex items-start gap-4 group">
                      {/* Icon bubble */}
                      <div
                        className="relative z-10 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border-2 border-white shadow-sm transition-transform duration-150 group-hover:scale-110"
                        style={{ background: bg, color: fg }}
                      >
                        {iconMap[act.icon] || <ActivityIcon className="w-4 h-4" />}
                      </div>

                      {/* Content card */}
                      <div className="flex-1 bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 hover:shadow-md transition-shadow duration-200 mb-2">
                        <p className="text-sm text-slate-800 leading-snug">{act.description}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs font-medium" style={{ color: fg }}>@{act.actor}</span>
                          <span className="w-1 h-1 bg-slate-300 rounded-full" />
                          <span className="text-xs text-slate-400">{formatTime(act.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
