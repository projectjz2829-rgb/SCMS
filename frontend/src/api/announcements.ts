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
    const payload: any = {}
    if (announcement.title !== undefined) payload.title = announcement.title
    if (announcement.message !== undefined) payload.message = announcement.message
    if (announcement.priority !== undefined) payload.priority = announcement.priority
    if (announcement.pinned !== undefined) payload.pinned = announcement.pinned
    if (announcement.active !== undefined) payload.active = announcement.active
    if (announcement.expiry_date !== undefined) payload.expiry_date = announcement.expiry_date
    const { data } = await api.put(`/api/announcements/${id}`, payload);
    return data.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/announcements/${id}`);
  }
};
