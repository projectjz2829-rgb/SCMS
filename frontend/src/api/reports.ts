import api from './index'

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

export interface ReportStudent {
  id: number
  full_name: string
  roll_no: string
  dept: string
}

export const reportsApi = {
  downloadAttendanceCsv: async (courseId: number) => {
    const res = await api.get(`/api/reports/csv/attendance?course_id=${courseId}`, {
      responseType: 'blob'
    })
    return res.data
  },

  downloadMarksCsv: async (courseId: number) => {
    const res = await api.get(`/api/reports/csv/marks?course_id=${courseId}`, {
      responseType: 'blob'
    })
    return res.data
  },

  getTranscript: async (studentId: number) => {
    const res = await api.get<{ data: TranscriptData }>(`/api/reports/transcript/${studentId}`)
    return res.data
  },

  getStudentsForReports: async (search?: string): Promise<ReportStudent[]> => {
    const params = search ? `?search=${encodeURIComponent(search)}` : ''
    const res = await api.get<{ data: ReportStudent[] }>(`/api/reports/students${params}`)
    return res.data.data
  },
}
