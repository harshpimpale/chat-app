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

// Unsubscribe from push notifications
router.post('/unsubscribe', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Remove subscription from user
    await User.findByIdAndUpdate(req.userId, {
      $unset: { pushSubscription: '' }
    });
    
    console.log(`User ${req.userId} unsubscribed from push notifications`);
    res.json({ success: true });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add this route for testing
router.post('/test-manual', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    
    // Manually create a fake subscription for testing
    const fakeSubscription = {
      endpoint: 'https://test-endpoint.com',
      keys: {
        p256dh: 'test-key',
        auth: 'test-auth'
      }
    };
    
    await User.findByIdAndUpdate(userId, {
      pushSubscription: fakeSubscription
    });
    
    res.json({ message: 'Fake subscription created for testing' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});



export default router;
