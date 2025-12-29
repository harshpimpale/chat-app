import axios from 'axios';

// Token management
export const setAuthToken = (token: string) => {
  localStorage.setItem('authToken', token);
  console.log('✅ Token saved to localStorage');
};

export const getAuthToken = (): string | null => {
  const token = localStorage.getItem('authToken');
  console.log('🔑 Getting token from localStorage:', token ? 'Found' : 'Not found');
  return token;
};

export const removeAuthToken = () => {
  localStorage.removeItem('authToken');
  console.log('🗑️ Token removed from localStorage');
};

const api = axios.create({
  baseURL: ((import.meta as any).env?.VITE_API_URL || 'http://localhost:5000') + '/api',
  withCredentials: false  // Change to false for cross-domain
});

// Add token to every request
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('🌐 API Request with token:', config.method?.toUpperCase(), config.url);
  } else {
    console.log('🌐 API Request without token:', config.method?.toUpperCase(), config.url);
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('❌ API Error:', error.response?.status, error.config?.url, error.response?.data);
    return Promise.reject(error);
  }
);

export interface User {
  _id?: string;
  id?: string;
  username: string;
  email: string;
  isOnline: boolean;
  lastSeen?: Date | string;
}

export interface Message {
  _id: string;
  sender: string | User;
  recipient: string | User;
  content: string;
  timestamp: string;
  read: boolean;
}

const normalizeUser = (user: any): User => {
  return {
    ...user,
    id: user.id || user._id,
    _id: user._id || user.id
  };
};

export const authAPI = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  
  logout: () => {
    removeAuthToken();
    return api.post('/auth/logout');
  },
  
  getCurrentUser: () =>
    api.get('/auth/me')
};

export const messageAPI = {
  getUsers: async () => {
    const response = await api.get<{ users: User[] }>('/messages/users');
    return {
      ...response,
      data: {
        users: response.data.users.map(normalizeUser)
      }
    };
  },
  
  getConversation: (recipientId: string) =>
    api.get<{ messages: Message[] }>(`/messages/conversation/${recipientId}`),
  
  sendMessage: (data: { recipientId: string; content: string }) =>
    api.post<{ message: Message }>('/messages/send', data),
  
  getUnreadCount: () =>
    api.get<{ count: number }>('/messages/unread-count')
};

export const notificationAPI = {
  getVapidPublicKey: () =>
    api.get<{ publicKey: string }>('/notifications/vapid-public-key'),
  
  subscribe: (subscription: PushSubscription) =>
    api.post('/notifications/subscribe', { subscription }),
  
  unsubscribe: () =>
    api.post('/notifications/unsubscribe')
};

export default api;
