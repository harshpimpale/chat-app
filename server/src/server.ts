import dotenv from 'dotenv';

// IMPORTANT: Load .env FIRST before any other imports
dotenv.config();

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { connectDatabase } from './config/database.js';
import authRoutes from './routes/auth.js';
import messageRoutes from './routes/messages.js';
import notificationRoutes from './routes/notifications.js';
import User from './models/User.js';
import jwt from 'jsonwebtoken';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true, // Important!
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(cookieParser());


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Socket.IO for real-time messaging
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);
  console.log('📋 Listing all registered socket events...');
  
  // Log all events being listened to
  socket.onAny((eventName, ...args) => {
    console.log(`📡 Received event: "${eventName}"`, args.length > 0 ? `with ${args.length} args` : '');
  });
  
  // Authenticate socket connection
  socket.on('authenticate', async (token: string) => {
    try {
      console.log('🔐 Socket authentication attempt');
      console.log('  - Socket ID:', socket.id);
      console.log('  - Token from client:', token ? 'Provided' : 'Empty (will check cookies)');
      
      let authToken = token;
      
      // If no token provided or empty, read from cookie
      if (!authToken || authToken === '') {
        console.log('  - Reading from cookies...');
        const cookieHeader = socket.handshake.headers.cookie;
        console.log('  - Raw cookie header:', cookieHeader);
        
        if (cookieHeader) {
          // Parse cookies
          const cookies = cookieHeader.split(';').reduce((acc: any, cookie) => {
            const [key, value] = cookie.trim().split('=');
            acc[key] = value;
            return acc;
          }, {});
          
          console.log('  - Parsed cookies:', Object.keys(cookies));
          
          authToken = cookies.token;
          
          if (authToken) {
            console.log('✅ Token found in cookie!');
          } else {
            console.error('❌ No token cookie found');
            console.error('   Available cookies:', Object.keys(cookies));
          }
        } else {
          console.error('❌ No cookie header in handshake');
        }
      }
      
      if (!authToken) {
        console.error('❌ No token found');
        socket.emit('auth-error', { error: 'No authentication token' });
        return;
      }
      
      console.log('  - Verifying token...');
      const decoded = jwt.verify(authToken, process.env.JWT_SECRET || 'secret') as { userId: string };
      console.log('✅ Token verified! userId:', decoded.userId);
      
      socket.data.userId = decoded.userId;
      
      await User.findByIdAndUpdate(decoded.userId, { isOnline: true });
      socket.join(decoded.userId);
      io.emit('user-status', { userId: decoded.userId, isOnline: true });
      socket.emit('authenticated', { success: true, userId: decoded.userId });
      
      console.log(`✅✅✅ Socket authenticated successfully for user ${decoded.userId}`);
    } catch (error) {
      console.error('❌ Socket authentication error:', error);
      socket.emit('auth-error', { error: 'Authentication failed' });
    }
  });

  
  // Send message
  socket.on('send-message', async (data: { recipientId: string; content: string }) => {
    console.log('📨 SEND-MESSAGE EVENT RECEIVED');
    try {
      const senderId = socket.data.userId;
      
      console.log('📨 Socket message event:', {
        from: senderId,
        to: data.recipientId,
        authenticated: !!senderId,
        socketId: socket.id,
        socketData: socket.data
      });
      
      if (!senderId) {
        console.error('❌ Unauthorized: Socket not authenticated');
        console.error('   Socket data:', socket.data);
        socket.emit('message-error', { error: 'Not authenticated' });
        return;
      }
      
      // Emit to recipient's room if they're online
      console.log(`📤 Emitting message to room: ${data.recipientId}`);
      io.to(data.recipientId).emit('receive-message', {
        senderId,
        content: data.content,
        timestamp: new Date()
      });
      
      // Confirm to sender
      socket.emit('message-sent', { success: true });
      
      console.log(`✅ Message delivered via socket`);
    } catch (error) {
      console.error('❌ Send message error:', error);
      socket.emit('message-error', { error: 'Failed to send message' });
    }
  });
  
  // Typing indicator
  socket.on('typing', (recipientId: string) => {
    console.log('⌨️ TYPING EVENT RECEIVED');
    if (!socket.data.userId) return;
    io.to(recipientId).emit('user-typing', { userId: socket.data.userId });
  });
  
  socket.on('stop-typing', (recipientId: string) => {
    console.log('⌨️ STOP-TYPING EVENT RECEIVED');
    if (!socket.data.userId) return;
    io.to(recipientId).emit('user-stop-typing', { userId: socket.data.userId });
  });
  
  // Disconnect
  socket.on('disconnect', async () => {
    console.log('👋 Socket disconnecting:', socket.id);
    if (socket.data.userId) {
      console.log(`  - User ${socket.data.userId} going offline`);
      await User.findByIdAndUpdate(socket.data.userId, {
        isOnline: false,
        lastSeen: new Date()
      });
      
      io.emit('user-status', { userId: socket.data.userId, isOnline: false });
      console.log(`✅ User ${socket.data.userId} marked offline`);
    }
  });
});



// Connect to database and start server
const PORT = process.env.PORT || 5000;

connectDatabase().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Socket.IO server ready`);
  });
});
