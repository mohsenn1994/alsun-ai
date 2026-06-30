import { createHash, timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../config';

const COOKIE_NAME = 'alsun_session';

// Constant-time comparison (hash to equal length first so length differences
// don't leak via timing).
function safeEqual(a: string, b: string): boolean {
  const ah = createHash('sha256').update(a).digest();
  const bh = createHash('sha256').update(b).digest();
  return timingSafeEqual(ah, bh);
}

/** True iff the supplied credentials match the configured single creator. */
export function checkCredentials(username: string, password: string): boolean {
  return safeEqual(username, config.auth.username) && safeEqual(password, config.auth.password);
}

/** Set the signed, httpOnly session cookie (value = username). */
export function setSession(reply: FastifyReply, username: string): void {
  reply.setCookie(COOKIE_NAME, username, {
    signed: true,
    httpOnly: true,
    // Cross-site (Vercel ⇄ Railway) needs SameSite=None; Secure in production.
    sameSite: config.isProduction ? 'none' : 'lax',
    secure: config.isProduction,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

/** Clear the session cookie. */
export function clearSession(reply: FastifyReply): void {
  // Must match the attributes setSession used (sameSite/secure), or the
  // browser treats this as a different cookie and won't actually clear it.
  reply.clearCookie(COOKIE_NAME, {
    path: '/',
    sameSite: config.isProduction ? 'none' : 'lax',
    secure: config.isProduction,
  });
}

/** Return the authenticated username from a valid signed cookie, else null. */
export function getSessionUser(request: FastifyRequest): string | null {
  const raw = request.cookies[COOKIE_NAME];
  if (!raw) return null;
  const unsigned = request.unsignCookie(raw);
  if (!unsigned.valid || unsigned.value == null) return null;
  // Single creator: the cookie must carry the configured username.
  return safeEqual(unsigned.value, config.auth.username) ? unsigned.value : null;
}
