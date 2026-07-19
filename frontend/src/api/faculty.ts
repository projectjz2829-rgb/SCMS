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
  getAll: async (params?: any): Promise<Faculty[]> => {
    const { data } = await api.get('/api/faculty/', { params });
    return data.data;
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
    const { data } = await api.put(`/api/faculty/${id}`, faculty);
    return data.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/faculty/${id}`);
  }
};