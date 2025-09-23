import jwt from 'jsonwebtoken';
import { config } from '../config'; 

export function signToken(userId: number) {
  return jwt.sign({ id: userId }, config.jwtSecret, { expiresIn: '1h' });
}
export function verifyToken(token: string) {
  return jwt.verify(token, config.jwtSecret);
}
