import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Sign a JWT containing the user's id and role.
 * The secret is read from JWT_SECRET in .env — never hardcoded.
 */
export function signToken(payload) {
  if (!SECRET) throw new Error('JWT_SECRET is not set in environment variables.');
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

/**
 * Verify a JWT and return the decoded payload.
 * Throws if the token is invalid or expired.
 */
export function verifyToken(token) {
  if (!SECRET) throw new Error('JWT_SECRET is not set in environment variables.');
  return jwt.verify(token, SECRET);
}
