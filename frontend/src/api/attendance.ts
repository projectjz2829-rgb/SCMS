import api from './index';

export interface Attendance {
  id?: number;
  student_id: number;
  student_name?: string;
  course_id: number;
  course_code?: string;
  course_name?: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent' | 'late';
  marked_by?: number;
  created_at?: string;
}

export const attendanceApi = {
  getAll: async (params?: any): Promise<Attendance[]> => {
    const { data } = await api.get('/api/attendance/', { params });
    return data.data;
  },
  getById: async (id: number): Promise<Attendance> => {
    const { data } = await api.get(`/api/attendance/${id}`);
    return data.data;
  },
  markBatch: async (data: { course_id: number; date: string; records: { student_id: number; status: string }[] }): Promise<void> => {
    await api.post('/api/attendance/', data);
  },
  update: async (id: number, attendance: Partial<Attendance>): Promise<Attendance> => {
    const { data } = await api.put(`/api/attendance/${id}`, attendance);
    return data.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/attendance/${id}`);
  }
};
