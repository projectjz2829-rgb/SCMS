import api from './index';

export interface DashboardStats {
  total_students: number;
  total_faculty?: number;
  total_courses: number;
  avg_attendance: number;
  students_by_dept?: { name: string; students: number; fill: string }[];
  attendance_trend?: { month: string; attendance: number }[];
  overall_gpa?: number;
  grade_distribution?: { grade: string; count: number; fill: string }[];
  weekly_attendance?: { day: string; present: number; absent: number }[];
  schedule?: { time: string; course: string; room: string; students: number }[];
}

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const { data } = await api.get('/api/dashboard/stats');
    return data.data; // Assuming success_response wraps data in a 'data' field
  }
};
