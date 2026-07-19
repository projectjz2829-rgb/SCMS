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
  getAll: async (params?: any): Promise<Student[]> => {
    const { data } = await api.get('/api/students/', { params });
    return data.data;
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
    const { data } = await api.put(`/api/students/${id}`, student);
    return data.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/students/${id}`);
  }
};