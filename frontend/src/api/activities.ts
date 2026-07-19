import api from './index';

export interface Activity {
  id: number;
  description: string;
  actor: string;
  icon: string;
  timestamp: string;
}

export const activitiesApi = {
  getAll: async (limit: number = 50): Promise<Activity[]> => {
    const { data } = await api.get('/api/activities/', { params: { limit } });
    return data.data;
  }
};
