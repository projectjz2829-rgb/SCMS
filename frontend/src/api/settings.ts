import api from './index';

export interface UserSettings {
  id: number;
  user_id: number;
  theme: string;
  notifications: {
    announcements: boolean;
    marks: boolean;
    attendance: boolean;
    system: boolean;
    email: boolean;
  };
}

export const settingsApi = {
  getSettings: async (): Promise<UserSettings> => {
    const { data } = await api.get('/api/settings/');
    return data.data;
  },
  updateSettings: async (settings: Partial<UserSettings>): Promise<UserSettings> => {
    const payload: any = {};
    if (settings.theme !== undefined) {
      payload.theme = settings.theme;
    }
    if (settings.notifications !== undefined) {
      payload.announcement_notifications = settings.notifications.announcements;
      payload.marks_notifications = settings.notifications.marks;
      payload.attendance_notifications = settings.notifications.attendance;
      payload.system_notifications = settings.notifications.system;
      payload.email_notifications = settings.notifications.email;
    }
    const { data } = await api.put('/api/settings/', payload);
    return data.data;
  },
  updatePassword: async (current_pw: string, new_pw: string): Promise<void> => {
    await api.put('/api/settings/password', { current_pw, new_pw });
  }
};
