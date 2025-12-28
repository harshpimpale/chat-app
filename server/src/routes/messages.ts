import express from 'express';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { sendPushNotification } from '../utils/pushNotifications.js';

const router = express.Router();

// Get all users (for chat list)
router.get('/users', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const users = await User.find({ _id: { $ne: req.userId } })
      .select('username email isOnline lastSeen')
      .sort({ isOnline: -1, username: 1 });
    
    // Transform _id to id for frontend compatibility
    const transformedUsers = users.map(user => ({
      id: user._id.toString(),
      _id: user._id.toString(),
      username: user.username,
      email: user.email,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen
    }));
    
    console.log('✅ Returning users:', transformedUsers.length);
    res.json({ users: transformedUsers });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


// Get messages between two users
router.get('/conversation/:recipientId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { recipientId } = req.params;
    
    console.log('📨 Get conversation request:');
    console.log('  - Current user:', req.userId);
    console.log('  - Recipient:', recipientId);
    
    // Validate recipientId
    if (!recipientId || recipientId === 'undefined' || recipientId === 'null') {
      console.error('❌ Invalid recipientId:', recipientId);
      return res.status(400).json({ error: 'Invalid recipient ID' });
    }
    
    // Add validation
    if (!req.userId) {
      console.error('❌ No userId in request');
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const messages = await Message.find({
      $or: [
        { sender: req.userId, recipient: recipientId },
        { sender: recipientId, recipient: req.userId }
      ]
    })
      .populate('sender', 'username')
      .populate('recipient', 'username')
      .sort({ timestamp: 1 })
      .limit(100);
    
    console.log(`✅ Found ${messages.length} messages`);
    
    // Mark messages as read
    await Message.updateMany(
      { sender: recipientId, recipient: req.userId, read: false },
      { read: true }
    );
    
    res.json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Send message
router.post('/send', authenticate, async (req: AuthRequest, res) => {
  try {
    console.log('📨 Send message request received');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    console.log('Body type:', typeof req.body);
    console.log('Body keys:', Object.keys(req.body));
    console.log('recipientId:', req.body.recipientId, 'type:', typeof req.body.recipientId);
    console.log('content:', req.body.content, 'type:', typeof req.body.content);
    console.log('userId from auth:', req.userId);
    
    const { recipientId, content } = req.body;
    
    // Add validation
    if (!req.userId) {
      console.error('❌ No userId in request');
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    if (!recipientId) {
      console.error('❌ recipientId is missing from body');
      return res.status(400).json({ error: 'Recipient ID is required', received: { recipientId, content, body: req.body } });
    }
    
    if (!content) {
      console.error('❌ content is missing from body');
      return res.status(400).json({ error: 'Content is required', received: { recipientId, content, body: req.body } });
    }

    if (typeof content !== 'string' || content.trim().length === 0) {
      console.error('❌ Invalid content type or empty');
      return res.status(400).json({ error: 'Content must be a non-empty string' });
    }
    
    // Rest of the code...
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      console.error('❌ Recipient not found:', recipientId);
      return res.status(404).json({ error: 'Recipient not found' });
    }

    console.log('✅ Validation passed, creating message...');
    
    const message = new Message({
      sender: req.userId,
      recipient: recipientId,
      content: content.trim(),
      timestamp: new Date(),
      read: false
    });
    
    await message.save();
    console.log('✅ Message saved:', message._id);
    
    await message.populate('sender', 'username');
    await message.populate('recipient', 'username');
    
    const sender = await User.findById(req.userId);
    
    if (recipient && !recipient.isOnline) {
      await sendPushNotification(recipientId, {
        title: `New message from ${sender?.username || 'Someone'}`,
        body: content.trim(),
        data: {
          url: `/chat/${req.userId}`,
          senderId: req.userId
        }
      });
    }
    
    console.log('✅ Sending response with message');
    res.status(201).json({ message });
  } catch (error) {
    console.error('❌ Send message error:', error);
    res.status(500).json({ error: 'Server error', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});



// Get unread message count
router.get('/unread-count', authenticate, async (req: AuthRequest, res) => {
  try {
    // Add validation
    if (!req.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const count = await Message.countDocuments({
      recipient: req.userId,
      read: false
    });
    
    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
