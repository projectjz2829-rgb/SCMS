import api from './index';

export interface User {
  id: number;
  email: string;
  role: 'admin' | 'faculty' | 'student';
  profile?: any;
}

export interface AuthResponse {
  authenticated: boolean;
  user: User | null;
}

export const authApi = {
  checkSession: async (): Promise<AuthResponse> => {
    const { data } = await api.get('/api/auth/me');
    return data.data; // Unwrap Flask success_response payload
  },
  
  // Login directly posts to the Flask /login route, but we'll adapt Flask to return JSON.
  login: async (credentials: Record<string, string>) => {
    // Send standard FormData as Flask expects by default, or we can send JSON if Flask is adapted.
    // Assuming Flask will be adapted to accept JSON.
    const { data } = await api.post('/auth/login', credentials, {
      // Temporarily use the root login path until API is fully migrated if needed,
      // but the user said "Use existing Flask /login endpoint".
      baseURL: '/'
    });
    return data;
  },
  
  logout: async () => {
    const { data } = await api.post('/auth/logout', {}, { baseURL: '/' });
    return data;
  }
};
