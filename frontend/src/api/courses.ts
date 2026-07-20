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
  getAll: async (params?: any): Promise<{ data: Course[], meta?: any }> => {
    const { data } = await api.get('/api/courses/', { params });
    return { data: data.data, meta: data.meta };
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
    const payload: any = {}
    if (course.name !== undefined) payload.name = course.name
    if (course.dept !== undefined) payload.dept = course.dept
    if (course.semester !== undefined) payload.semester = Number(course.semester)
    if (course.faculty_id !== undefined) payload.faculty_id = course.faculty_id ? Number(course.faculty_id) : null
    const { data } = await api.put(`/api/courses/${id}`, payload);
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
