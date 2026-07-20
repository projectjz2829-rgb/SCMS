import api from './index';

export interface Faculty {
  id?: number;
  user_id?: number;
  emp_id: string;
  full_name: string;
  dept: string;
  designation: string;
  phone?: string;
  email?: string;
  status?: string; // e.g., 'Active', 'Inactive'
  join_date?: string;
  password?: string;
}

export const facultyApi = {
  getAll: async (params?: any): Promise<{ data: Faculty[], meta?: any }> => {
    const { data } = await api.get('/api/faculty/', { params });
    return { data: data.data, meta: data.meta };
  },
  getById: async (id: number): Promise<Faculty> => {
    const { data } = await api.get(`/api/faculty/${id}`);
    return data.data;
  },
  create: async (faculty: Partial<Faculty>): Promise<Faculty> => {
    const { data } = await api.post('/api/faculty/', faculty);
    return data.data;
  },
  update: async (id: number, faculty: Partial<Faculty>): Promise<Faculty> => {
    const payload: any = {}
    if (faculty.full_name !== undefined) payload.full_name = faculty.full_name
    if (faculty.dept !== undefined) payload.dept = faculty.dept
    if (faculty.designation !== undefined) payload.designation = faculty.designation
    if (faculty.phone !== undefined) payload.phone = faculty.phone
    const { data } = await api.put(`/api/faculty/${id}`, payload);
    return data.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/faculty/${id}`);
  }
};