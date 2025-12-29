import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;
    
    // Try Authorization header FIRST (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      console.log('🔐 Auth check - Token: From Bearer header');
    } 
    // Fall back to cookie (for same-origin requests)
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
      console.log('🔐 Auth check - Token: From cookie');
    } 
    else {
      console.log('🔐 Auth check - Token: Missing');
      console.log('🍪 All cookies:', req.cookies);
      console.log('📋 Authorization header:', req.headers.authorization || 'None');
      console.error('❌ No token found in cookies or headers');
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Verify token
    if (!token) {
      throw new Error('Token is undefined');
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as unknown as { userId: string };
    req.userId = decoded.userId;
    console.log('✅ Token verified, userId:', decoded.userId);
    
    next();
  } catch (error) {
    console.error('❌ Token verification failed:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};
