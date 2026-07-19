import api from './index';

export interface Announcement {
  id: number;
  title: string;
  message: string;
  priority: 'normal' | 'important' | 'urgent';
  pinned: boolean;
  active: boolean;
  expiry_date?: string;
  created_by?: number;
  creator_name?: string;
  created_at: string;
  updated_at: string;
}

export const announcementsApi = {
  getAll: async (): Promise<Announcement[]> => {
    const { data } = await api.get('/api/announcements/');
    return data.data;
  },
  create: async (announcement: Partial<Announcement>): Promise<Announcement> => {
    const { data } = await api.post('/api/announcements/', announcement);
    return data.data;
  },
  update: async (id: number, announcement: Partial<Announcement>): Promise<Announcement> => {
    const { data } = await api.put(`/api/announcements/${id}`, announcement);
    return data.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/announcements/${id}`);
  }
};
