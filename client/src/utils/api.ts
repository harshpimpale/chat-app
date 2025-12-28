import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true
});

// Debug interceptor
api.interceptors.request.use((config) => {
  console.log('🌐 API Request:', config.method?.toUpperCase(), config.url);
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
  lastSeen?: Date | string; // Can be Date or string from API
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
    id: user.id || user._id,  // Ensure id property exists
    _id: user._id || user.id
  };
};

export const authAPI = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  
  logout: () =>
    api.post('/auth/logout'),
  
  getCurrentUser: () =>
    api.get('/auth/me')
};

export const messageAPI = {
  getUsers: async () => {
    const response = await api.get<{ users: User[] }>('/messages/users');
    // Normalize all users
    return {
      ...response,
      data: {
        users: response.data.users.map(normalizeUser)
      }
    };
  },
  
  getConversation: (recipientId: string) =>
    api.get<{ messages: Message[] }>(`/messages/conversation/${recipientId}`),
  
  sendMessage: (data: { recipientId: string; content: string }) => {
    console.log('📮 messageAPI.sendMessage called with:', data);
    
    if (!data.recipientId) {
      console.error('❌ recipientId is missing!');
      throw new Error('recipientId is required');
    }
    
    if (!data.content) {
      console.error('❌ content is missing!');
      throw new Error('content is required');
    }
    
    return api.post<{ message: Message }>('/messages/send', data);
  },
  
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
