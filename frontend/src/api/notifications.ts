import api from './index';
import { Announcement } from './announcements';

export const notificationsApi = {
  getUnread: async (): Promise<Announcement[]> => {
    const { data } = await api.get('/api/notifications/');
    return data.data;
  },
  markAllRead: async (): Promise<void> => {
    await api.post('/api/notifications/read-all');
  },
  markRead: async (announcementId: number): Promise<void> => {
    await api.post(`/api/notifications/${announcementId}/read`);
  }
};
