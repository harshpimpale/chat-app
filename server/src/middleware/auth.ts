import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Get token from cookies
    const token = req.cookies.token;
    
    console.log('🔐 Auth check - Token:', token ? 'Present' : 'Missing');
    console.log('🍪 All cookies:', req.cookies);
    
    if (!token) {
      console.log('❌ No token found in cookies');
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string };
    
    console.log('✅ Token verified, userId:', decoded.userId);
    req.userId = decoded.userId;
    
    next();
  } catch (error) {
    console.error('❌ Auth error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
