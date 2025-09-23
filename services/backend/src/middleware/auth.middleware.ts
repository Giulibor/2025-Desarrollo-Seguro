import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

interface JwtPayload {
  id: string;
}

export default function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { id: string };
    req.user = { id: String(decoded.id) };  
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}