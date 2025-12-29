import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { messageAPI, User, Message, getAuthToken } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { Menu, X, Wifi, WifiOff } from 'lucide-react';
import UserList from './UserList';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import Navbar from '../Layout/Navbar';

const ChatWindow: React.FC = () => {
  const { user, loading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<{ [userId: string]: number }>({});
  const [socketConnected, setSocketConnected] = useState(false);
  const [showUserList, setShowUserList] = useState(false); // Mobile sidebar toggle

  // Loading screen
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-gray-700 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔒</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please log in to access your messages</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all font-medium shadow-lg"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Socket initialization (same as before)
  useEffect(() => {
    if (!user) return;

    const token = getAuthToken();
    if (!token) {
      window.location.href = '/login';
      return;
    }

    const apiUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:5000';
    const newSocket = io(apiUrl, {
      withCredentials: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: { token }
    });

    newSocket.on('connect', () => {
      setSocketConnected(true);
      newSocket.emit('authenticate', token);
    });

    newSocket.on('disconnect', () => setSocketConnected(false));
    newSocket.on('connect_error', () => setSocketConnected(false));
    newSocket.on('reconnect', () => setSocketConnected(true));

    setSocket(newSocket);
    return () => { newSocket.close(); };
  }, [user]);

  // Socket listeners (same as before)
  useEffect(() => {
    if (!socket) return;

    socket.on('receive-message', (data: { senderId: string; content: string; timestamp: Date }) => {
      if (selectedUser && (data.senderId === selectedUser.id || data.senderId === (selectedUser as any)._id)) {
        const newMessage: Message = {
          _id: Date.now().toString(),
          sender: data.senderId,
          recipient: user?.id || '',
          content: data.content,
          timestamp: new Date(data.timestamp).toISOString(),
          read: true
        };
        setMessages(prev => [...prev, newMessage]);
      } else {
        setUnreadCounts(prev => ({
          ...prev,
          [data.senderId]: (prev[data.senderId] || 0) + 1
        }));
      }
    });

    socket.on('user-typing', (data: { userId: string }) => {
      if (selectedUser && (data.userId === selectedUser.id || data.userId === (selectedUser as any)._id)) {
        setIsTyping(true);
      }
    });

    socket.on('user-stop-typing', (data: { userId: string }) => {
      if (selectedUser && (data.userId === selectedUser.id || data.userId === (selectedUser as any)._id)) {
        setIsTyping(false);
      }
    });

    socket.on('user-status', (data: { userId: string; isOnline: boolean }) => {
      setUsers(prev => prev.map(u => {
        const uId = u.id || (u as any)._id;
        return uId === data.userId ? { ...u, isOnline: data.isOnline } : u;
      }));
    });

    return () => {
      socket.off('receive-message');
      socket.off('user-typing');
      socket.off('user-stop-typing');
      socket.off('user-status');
    };
  }, [socket, selectedUser, user]);

  // Load users
  useEffect(() => {
    if (user) loadUsers();
  }, [user]);

  // Load conversation
  useEffect(() => {
    if (selectedUser) {
      const recipientId = selectedUser.id || (selectedUser as any)._id;
      if (recipientId) {
        loadConversation(recipientId);
        setUnreadCounts(prev => ({ ...prev, [recipientId]: 0 }));
      }
    } else {
      setMessages([]);
    }
  }, [selectedUser]);

  const loadUsers = async () => {
    try {
      const { data } = await messageAPI.getUsers();
      setUsers(data.users);
    } catch (error: any) {
      if (error.response?.status === 401) {
        window.location.href = '/login';
      }
    }
  };

  const loadConversation = async (recipientId: string) => {
    if (!recipientId || recipientId === 'undefined') return;
    try {
      const { data } = await messageAPI.getConversation(recipientId);
      setMessages(data.messages);
    } catch (error: any) {
      if (error.response?.status === 401) {
        window.location.href = '/login';
      }
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedUser || !socket || !socket.connected || !content.trim()) return;

    const recipientId = selectedUser.id || (selectedUser as any)._id;
    const messageData = { recipientId, content: content.trim() };

    try {
      const response = await messageAPI.sendMessage(messageData);
      setMessages(prev => [...prev, response.data.message]);
      socket.emit('send-message', messageData);
    } catch (error: any) {
      if (error.response?.status === 401) {
        window.location.href = '/login';
      }
    }
  };

  const handleTyping = () => {
    const recipientId = selectedUser?.id || (selectedUser as any)?._id;
    if (recipientId && socket?.connected) {
      socket.emit('typing', recipientId);
    }
  };

  const handleStopTyping = () => {
    const recipientId = selectedUser?.id || (selectedUser as any)?._id;
    if (recipientId && socket?.connected) {
      socket.emit('stop-typing', recipientId);
    }
  };

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setShowUserList(false); // Close sidebar on mobile after selection
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Navbar />
      
      {/* Connection Status Banner */}
      {!socketConnected && (
        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 text-center text-sm flex items-center justify-center gap-2 shadow-md">
          <WifiOff className="w-4 h-4" />
          <span className="font-medium">Reconnecting to server...</span>
        </div>
      )}

      {socketConnected && (
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-1.5 text-center text-xs flex items-center justify-center gap-1.5">
          <Wifi className="w-3.5 h-3.5" />
          <span className="font-medium">Connected</span>
        </div>
      )}
      
      <div className="flex-1 flex overflow-hidden">
        {/* Mobile Overlay */}
        {showUserList && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setShowUserList(false)}
          />
        )}

        {/* User List Sidebar */}
        <div className={`
          fixed lg:relative inset-y-0 left-0 z-50
          w-80 lg:w-80 xl:w-96
          bg-white border-r border-gray-200
          transform transition-transform duration-300 ease-in-out
          ${showUserList ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <UserList
            users={users}
            selectedUser={selectedUser}
            onSelectUser={handleSelectUser}
            unreadCounts={unreadCounts}
          />
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Mobile Menu Button */}
                    <button
                      onClick={() => setShowUserList(true)}
                      className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Menu className="w-5 h-5 text-gray-600" />
                    </button>

                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                        {selectedUser.username.charAt(0).toUpperCase()}
                      </div>
                      {selectedUser.isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {selectedUser.username}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {selectedUser.isOnline ? (
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            Online
                          </span>
                        ) : (
                          'Offline'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <MessageList
                messages={messages}
                currentUserId={user?.id || user?._id || ''}
                selectedUser={selectedUser}
                isTyping={isTyping}
              />

              <MessageInput
                onSendMessage={handleSendMessage}
                onTyping={handleTyping}
                onStopTyping={handleStopTyping}
                disabled={!socketConnected}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <span className="text-5xl">💬</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-3">Welcome to Chat</h2>
                <p className="text-gray-600 mb-6">
                  Select a conversation from the sidebar to start messaging
                </p>
                <button
                  onClick={() => setShowUserList(true)}
                  className="lg:hidden bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all font-medium shadow-lg"
                >
                  View Conversations
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
