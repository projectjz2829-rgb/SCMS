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
  status?: string; // e.g., 'Active', 'Inactive'
  join_date?: string;
  password?: string;
}

export const studentsApi = {
  getAll: async (params?: any): Promise<{ data: Student[], meta?: any }> => {
    const { data } = await api.get('/api/students/', { params });
    return { data: data.data, meta: data.meta };
  },
  getById: async (id: number): Promise<Student> => {
    const { data } = await api.get(`/api/students/${id}`);
    return data.data;
  },
  create: async (student: Partial<Student>): Promise<Student> => {
    const { data } = await api.post('/api/students/', student);
    return data.data;
  },
  update: async (id: number, student: Partial<Student>): Promise<Student> => {
    const payload: any = {}
    if (student.full_name !== undefined) payload.full_name = student.full_name
    if (student.dept !== undefined) payload.dept = student.dept
    if (student.year !== undefined) payload.year = Number(student.year)
    if (student.section !== undefined) payload.section = student.section
    if (student.phone !== undefined) payload.phone = student.phone
    const { data } = await api.put(`/api/students/${id}`, payload);
    return data.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/students/${id}`);
  }
};