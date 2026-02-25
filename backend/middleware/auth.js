import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

export const authenticate = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer '))
      return res.status(401).json({ success: false, message: 'No token provided.' });

    const decoded = jwt.verify(auth.slice(7), process.env.JWT_SECRET);

    const { rows } = await query(
      'SELECT id, name, email, role, hourly_rate, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (!rows.length)
      return res.status(401).json({ success: false, message: 'User not found.' });
    if (!rows[0].is_active)
      return res.status(401).json({ success: false, message: 'Account inactive.' });

    req.user = rows[0];
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token expired.' : 'Invalid token.';
    return res.status(401).json({ success: false, message: msg });
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role))
    return res.status(403).json({ success: false, message: `Requires role: ${roles.join(' or ')}` });
  next();
};

export const generateToken = (user) =>
  jwt.sign({ userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
