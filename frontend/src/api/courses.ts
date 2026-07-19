import api from './index';

export interface Course {
  id?: number;
  name: string;
  code: string;
  faculty_id?: number;
  faculty_name?: string;
  dept: string;
  semester: number;
  enrolled_count?: number;
}

export const coursesApi = {
  getAll: async (params?: any): Promise<Course[]> => {
    const { data } = await api.get('/api/courses/', { params });
    return data.data;
  },
  getById: async (id: number): Promise<Course> => {
    const { data } = await api.get(`/api/courses/${id}`);
    return data.data;
  },
  create: async (course: Partial<Course>): Promise<Course> => {
    const { data } = await api.post('/api/courses/', course);
    return data.data;
  },
  update: async (id: number, course: Partial<Course>): Promise<Course> => {
    const { data } = await api.put(`/api/courses/${id}`, course);
    return data.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/courses/${id}`);
  },
  enroll: async (courseId: number, studentId: number): Promise<void> => {
    await api.post(`/api/courses/${courseId}/enroll`, { student_id: studentId });
  },
  getStudents: async (courseId: number): Promise<any[]> => {
    const { data } = await api.get(`/api/courses/${courseId}/students`);
    return data.data;
  }
};
