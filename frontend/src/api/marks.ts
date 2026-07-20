import api from './index';

export interface Marks {
  id?: number;
  student_id: number;
  student_name?: string;
  course_id: number;
  course_code?: string;
  internal_1: number;
  internal_2: number;
  semester_final: number;
  practical: number;
  total_earned?: number;
  grade?: string;
  grade_point?: number;
  entered_by?: number;
  academic_year: string;
  created_at?: string;
}

export const marksApi = {
  getAll: async (params?: any): Promise<Marks[]> => {
    const { data } = await api.get('/api/marks/', { params });
    return data.data;
  },
  getById: async (id: number): Promise<Marks> => {
    const { data } = await api.get(`/api/marks/${id}`);
    return data.data;
  },
  create: async (marks: Partial<Marks>): Promise<Marks> => {
    const { data } = await api.post('/api/marks/', marks);
    return data.data;
  },
  update: async (id: number, marks: Partial<Marks>): Promise<Marks> => {
    const payload: any = {}
    if (marks.internal_1 !== undefined) payload.internal_1 = marks.internal_1
    if (marks.internal_2 !== undefined) payload.internal_2 = marks.internal_2
    if (marks.semester_final !== undefined) payload.semester_final = marks.semester_final
    if (marks.practical !== undefined) payload.practical = marks.practical
    const { data } = await api.put(`/api/marks/${id}`, payload);
    return data.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/marks/${id}`);
  }
};
