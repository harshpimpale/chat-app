import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Get VAPID public key
router.get('/vapid-public-key', (req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  
  if (!publicKey) {
    console.error('❌ VAPID_PUBLIC_KEY not configured');
    return res.status(500).json({ error: 'Push notifications not configured' });
  }
  
  console.log('✅ Sending VAPID public key');
  res.json({ publicKey });
});

// Subscribe to push notifications
router.post('/subscribe', authenticate, async (req: AuthRequest, res) => {
  try {
    const { subscription } = req.body;
    
    if (!req.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    if (!subscription) {
      return res.status(400).json({ error: 'Subscription data required' });
    }
    
    // Save subscription to user
    await User.findByIdAndUpdate(req.userId, {
      pushSubscription: subscription
    });
    
    console.log(`User ${req.userId} subscribed to push notifications`);
    res.json({ success: true });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
