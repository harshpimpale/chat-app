import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { messageAPI, User, Message } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import UserList from './UserList';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import Navbar from '../Layout/Navbar';

// Helper function to get cookie value
// function getCookie(name: string): string | null {
//   const value = `; ${document.cookie}`;
//   const parts = value.split(`; ${name}=`);
//   if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
//   return null;
// }

const ChatWindow: React.FC = () => {
  const { user, loading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<{ [userId: string]: number }>({});
  const [socketConnected, setSocketConnected] = useState(false);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading authentication...</p>
        </div>
      </div>
    );
  }

    // Show message if user not authenticated
  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please log in to access chat</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

// Initialize socket connection
useEffect(() => {
  if (!user) {
    console.log('⏳ Waiting for user authentication...');
    return;
  }

  console.log('🔌 Initializing socket...');
  console.log('👤 User authenticated:', user.id);
  console.log('🍪 Cookie is httpOnly and will be sent automatically by browser');

  const newSocket = io('http://localhost:5000', {
    withCredentials: true, // This tells browser to include httpOnly cookies!
    transports: ['websocket', 'polling']
  });

  newSocket.onAny((eventName, ...args) => {
    console.log(`📡 Event: "${eventName}"`, args);
  });

  newSocket.on('connect', () => {
    console.log('✅ Socket CONNECTED:', newSocket.id);
    setSocketConnected(true);
    
    // Emit authenticate WITHOUT token - server will read from cookie
    console.log('📤 Emitting authenticate (cookie sent in handshake)');
    newSocket.emit('authenticate', ''); // Empty string - server reads cookie
  });

  newSocket.on('authenticated', (data: { success: boolean; userId: string }) => {
    console.log('✅✅✅ AUTHENTICATED:', data);
  });

  newSocket.on('auth-error', (data: { error: string }) => {
    console.error('❌ AUTH-ERROR:', data);
  });

  newSocket.on('message-sent', (data: { success: boolean }) => {
    console.log('✅ MESSAGE-SENT:', data);
  });

  newSocket.on('message-error', (data: { error: string }) => {
    console.error('❌ MESSAGE-ERROR:', data);
  });

  newSocket.on('disconnect', (reason) => {
    console.log('❌ DISCONNECTED:', reason);
    setSocketConnected(false);
  });

  newSocket.on('connect_error', (error) => {
    console.error('❌ CONNECTION ERROR:', error);
  });

  setSocket(newSocket);

  return () => {
    console.log('🔌 Cleaning up socket');
    newSocket.close();
  };
}, [user]);


  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    console.log('📡 Setting up socket event listeners');

    socket.on('receive-message', (data: { senderId: string; content: string; timestamp: Date }) => {
      console.log('📨 Received message via socket:', data);
      
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
      console.log('👤 User status update:', data);
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
    if (user) {
      loadUsers();
    }
  }, [user]);

  // Load conversation when user is selected
  useEffect(() => {
    if (selectedUser) {
      const recipientId = selectedUser.id || (selectedUser as any)._id;
      if (recipientId) {
        console.log('📖 Loading conversation with user:', recipientId);
        loadConversation(recipientId);
        setUnreadCounts(prev => ({ ...prev, [recipientId]: 0 }));
      }
    } else {
      setMessages([]);
    }
  }, [selectedUser]);

  const loadUsers = async () => {
    try {
      console.log('👥 Loading users...');
      const { data } = await messageAPI.getUsers();
      console.log('✅ Loaded users:', data.users.length);
      setUsers(data.users);
    } catch (error) {
      console.error('❌ Error loading users:', error);
    }
  };

  const loadConversation = async (recipientId: string) => {
    if (!recipientId || recipientId === 'undefined') {
      console.error('❌ Invalid recipientId:', recipientId);
      return;
    }

    try {
      console.log('📖 Fetching conversation with:', recipientId);
      const { data } = await messageAPI.getConversation(recipientId);
      console.log('✅ Loaded messages:', data.messages.length);
      setMessages(data.messages);
    } catch (error) {
      console.error('❌ Error loading conversation:', error);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedUser) {
      console.error('❌ No user selected');
      alert('Please select a user to send message to');
      return;
    }

    const recipientId = selectedUser.id || (selectedUser as any)._id;

    if (!recipientId) {
      console.error('❌ No user ID found in:', selectedUser);
      alert('Invalid user selected');
      return;
    }

    if (!socket) {
      console.error('❌ Socket not initialized');
      alert('Connection not established. Please refresh the page.');
      return;
    }

    if (!socketConnected) {
      console.error('❌ Socket not connected');
      alert('Not connected to server. Please check your connection.');
      return;
    }

    if (!content || !content.trim()) {
      console.error('❌ Empty message');
      return;
    }

    const messageData = {
      recipientId: recipientId,
      content: content.trim()
    };

    console.log('📤 Preparing to send message:', messageData);

    try {
      console.log('💾 Calling API: POST /api/messages/send');
      
      const response = await messageAPI.sendMessage(messageData);

      console.log('✅ API Response received:', response.data);

      setMessages(prev => [...prev, response.data.message]);

      console.log('📡 Emitting via socket to:', recipientId);
      socket.emit('send-message', {
        recipientId: recipientId,
        content: content.trim()
      });

      console.log('✅ Message sent successfully');
    } catch (error: any) {
      console.error('❌ Error sending message:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      if (error.response?.status === 401) {
        alert('Session expired. Please login again.');
        window.location.href = '/login';
      } else if (error.response?.status === 400) {
        alert(`Invalid request: ${error.response.data.error || 'Please check your input'}`);
      } else {
        alert(`Failed to send message: ${error.response?.data?.error || error.message}`);
      }
    }
  };

  const handleTyping = () => {
    const recipientId = selectedUser?.id || (selectedUser as any)?._id;
    if (recipientId && socket && socketConnected) {
      socket.emit('typing', recipientId);
    }
  };

  const handleStopTyping = () => {
    const recipientId = selectedUser?.id || (selectedUser as any)?._id;
    if (recipientId && socket && socketConnected) {
      socket.emit('stop-typing', recipientId);
    }
  };

  // Show loading if user not authenticated yet
  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <Navbar />
      
      {!socketConnected && (
        <div className="bg-yellow-100 border-b border-yellow-400 px-4 py-2 text-center">
          <span className="text-yellow-800 text-sm">
            ⚠️ Connecting to server...
          </span>
        </div>
      )}
      
      <div className="flex-1 flex overflow-hidden">
        <UserList
          users={users}
          selectedUser={selectedUser}
          onSelectUser={setSelectedUser}
          unreadCounts={unreadCounts}
        />

        <div className="flex-1 flex flex-col">
          {selectedUser && (
            <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                    {selectedUser.username.charAt(0).toUpperCase()}
                  </div>
                  {selectedUser.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">
                    {selectedUser.username}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedUser.isOnline ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <MessageList
            messages={messages}
            currentUserId={user?.id || (user as any)?._id || ''}
            selectedUser={selectedUser}
            isTyping={isTyping}
          />

          <MessageInput
            onSendMessage={handleSendMessage}
            onTyping={handleTyping}
            onStopTyping={handleStopTyping}
            disabled={!selectedUser || !socketConnected}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
