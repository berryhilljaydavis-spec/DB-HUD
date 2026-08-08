import { createHmac, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';

const COOKIE = 'hud_auth';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function passcode(): string | null {
  const value = process.env.HUD_PASSCODE ?? '';
  return value === '' ? null : value;
}

function token(secret: string): string {
  return createHmac('sha256', secret).update(COOKIE).digest('hex');
}

function matches(candidate: string, expected: string): boolean {
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function cookieValue(header: string | undefined): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === COOKIE) return decodeURIComponent(rest.join('='));
  }
  return null;
}

/** Gates every /api route behind HUD_PASSCODE; without the variable the HUD stays open. */
export const requirePasscode: RequestHandler = (req, res, next) => {
  const secret = passcode();
  if (!secret) return next();

  // Mounted at /api, so the path arrives stripped of the mount point.
  if (req.method === 'POST' && (req.path === '/login' || req.path === '/api/login')) {
    const supplied = typeof req.body?.passcode === 'string' ? req.body.passcode : '';
    if (!matches(supplied, secret)) {
      res.status(401).json({ error: 'wrong passcode' });
      return;
    }
    res.cookie(COOKIE, token(secret), {
      httpOnly: true,
      sameSite: 'lax',
      secure: Boolean(process.env.VERCEL),
      maxAge: MAX_AGE_MS,
    });
    res.json({ ok: true });
    return;
  }

  const cookie = cookieValue(req.headers.cookie);
  if (cookie && matches(cookie, token(secret))) return next();
  res.status(401).json({ error: 'passcode required' });
};
