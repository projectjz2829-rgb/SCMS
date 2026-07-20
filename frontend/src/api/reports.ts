import { api } from './config'

export interface TranscriptData {
  student: {
    id: number
    name: string
    roll_no: string
    email: string
    dept: string
    year: number
    section: string
  }
  academic: {
    overall_gpa: number
    total_courses: number
    attendance_pct: number
  }
  courses: Array<{
    course_code: string
    course_name: string
    internal_1: number
    internal_2: number
    semester_final: number
    practical: number
    total: number
    grade: string
    grade_point: number
  }>
}

export const reportsApi = {
  downloadAttendanceCsv: async (courseId: number) => {
    const res = await api.get(`/reports/csv/attendance?course_id=${courseId}`, {
      responseType: 'blob'
    })
    return res.data
  },

  downloadMarksCsv: async (courseId: number) => {
    const res = await api.get(`/reports/csv/marks?course_id=${courseId}`, {
      responseType: 'blob'
    })
    return res.data
  },

  getTranscript: async (studentId: number) => {
    const res = await api.get<{ data: TranscriptData }>(`/reports/transcript/${studentId}`)
    return res.data
  }
}
