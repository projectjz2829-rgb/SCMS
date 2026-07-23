import api from './index';

export interface Student {
  id?: number;
  user_id?: number;
  roll_no: string;
  full_name: string;
  dept: string;
  year: number;
  section: string;
  phone?: string;
  email?: string;
  gpa?: number;
  attendance?: number;
  status?: string;
  join_date?: string;
  password?: string;
}

export interface StudentAttendanceRecord {
  id: number;
  course_id: number;
  course_code: string;
  course_name: string;
  date: string;
  status: 'present' | 'absent' | 'late';
}

export interface StudentMarkRecord {
  id: number;
  course_id: number;
  course_code: string;
  course_name?: string;
  internal_1: number;
  internal_2: number;
  semester_final: number;
  practical: number;
  total_earned?: number;
  grade?: string;
  grade_point?: number;
  academic_year: string;
}

export const studentsApi = {
  getAll: async (
    params?: Record<string, string | number | undefined>,
    signal?: AbortSignal
  ): Promise<{ data: Student[]; meta?: { page: number; limit: number; total: number; pages: number } }> => {
    const { data } = await api.get('/api/students/', { params, signal });
    return { data: data.data, meta: data.meta };
  },
  getById: async (id: number, signal?: AbortSignal): Promise<Student> => {
    const { data } = await api.get(`/api/students/${id}`, { signal });
    return data.data;
  },
  create: async (student: Partial<Student>): Promise<Student> => {
    const { data } = await api.post('/api/students/', student);
    return data.data;
  },
  update: async (id: number, student: Partial<Student>): Promise<Student> => {
    const payload: Record<string, string | number | undefined> = {};
    if (student.full_name !== undefined) payload.full_name = student.full_name;
    if (student.dept !== undefined) payload.dept = student.dept;
    if (student.year !== undefined) payload.year = Number(student.year);
    if (student.section !== undefined) payload.section = student.section;
    if (student.phone !== undefined) payload.phone = student.phone;
    const { data } = await api.put(`/api/students/${id}`, payload);
    return data.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/students/${id}`);
  },
  /** Student-scoped: fetch own attendance records. */
  getMyAttendance: async (studentId: number, signal?: AbortSignal): Promise<StudentAttendanceRecord[]> => {
    const { data } = await api.get(`/api/students/${studentId}/attendance`, { signal });
    return data.data;
  },
  /** Student-scoped: fetch own marks records. */
  getMyMarks: async (studentId: number, signal?: AbortSignal): Promise<StudentMarkRecord[]> => {
    const { data } = await api.get(`/api/students/${studentId}/marks`, { signal });
    return data.data;
  },
};