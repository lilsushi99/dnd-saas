import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import config from '../config/config';
import { executeQuery } from '../database/db';
import { auditRepository } from '../repositories/auditRepository';
import { loadPermissionsForRole } from '../middleware/auth';

const MIN_PASSWORD_LENGTH = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_HASH_RE = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

/** Minimal in-memory brute-force limiter: 8 failures / 15 min per (ip,email). */
const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;
const failures = new Map<string, { count: number; first: number }>();

function limiterKey(req: Request, email: string) {
  return `${req.ip}|${email.toLowerCase()}`;
}
function isBlocked(key: string): boolean {
  const f = failures.get(key);
  if (!f) return false;
  if (Date.now() - f.first > FAILURE_WINDOW_MS) {
    failures.delete(key);
    return false;
  }
  return f.count >= MAX_FAILURES;
}
function recordFailure(key: string) {
  const f = failures.get(key);
  if (!f || Date.now() - f.first > FAILURE_WINDOW_MS) failures.set(key, { count: 1, first: Date.now() });
  else f.count += 1;
}
export function _resetLoginLimiterForTests() {
  failures.clear();
}

function newUserId(): string {
  return `USR-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function signToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, config.auth.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: config.auth.jwtExpiresIn as any,
  });
}

export class AuthController {
  public login = async (req: Request, res: Response): Promise<void> => {
    try {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
      const password = typeof req.body?.password === 'string' ? req.body.password : '';

      if (!email || !password) {
        res.status(400).json({ success: false, message: 'Email and password are required.' });
        return;
      }

      const key = limiterKey(req, email);
      if (isBlocked(key)) {
        res.status(429).json({ success: false, message: 'Too many failed attempts. Please try again later.' });
        return;
      }

      const users = await executeQuery<any>(
        `SELECT id, name, email, password_hash AS passwordHash, role, branch, status, profile_photo AS profilePhoto
         FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1`,
        [email]
      );
      const user = users[0];

      // Same response for unknown user / wrong password so account existence is not revealed.
      const invalid = () => {
        recordFailure(key);
        res.status(401).json({ success: false, message: 'Invalid work email or password.' });
      };
      if (!user) return invalid();

      let valid = false;
      const stored: string = user.passwordHash || '';
      if (BCRYPT_HASH_RE.test(stored)) {
        valid = await bcrypt.compare(password, stored);
      } else if (stored.length > 0) {
        // Legacy rows inserted by hand (e.g. through phpMyAdmin) with a plain-text password.
        // Accept an exact match ONCE and immediately replace it with a bcrypt hash.
        const a = Buffer.from(stored);
        const b = Buffer.from(password);
        valid = a.length === b.length && crypto.timingSafeEqual(a, b);
        if (valid) {
          const upgraded = await bcrypt.hash(password, config.auth.bcryptRounds);
          await executeQuery(`UPDATE users SET password_hash = ? WHERE id = ?`, [upgraded, user.id]);
        }
      }
      if (!valid) return invalid();

      if (user.status !== 'Active') {
        res.status(403).json({ success: false, message: 'Your account has been deactivated. Contact your system administrator.' });
        return;
      }

      failures.delete(key);
      await executeQuery(`UPDATE users SET last_login = NOW() WHERE id = ?`, [user.id]);
      const permissions = await loadPermissionsForRole(user.role);

      auditRepository.logAction({
        user: user.name,
        action: 'USER_LOGIN',
        entity: 'users',
        entityId: user.id,
        newValue: { email: user.email, role: user.role, branch: user.branch },
      });

      res.json({
        success: true,
        token: signToken(user),
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          branch: user.branch,
          status: user.status,
          profilePhoto: user.profilePhoto,
          permissions,
        },
      });
    } catch (err: any) {
      console.error('Login Error:', err.message);
      res.status(500).json({ success: false, message: 'Server authentication error' });
    }
  };

  /**
   * Self-registration is intentionally limited to bootstrapping the FIRST account (always a Director).
   * After that, users are created by an administrator via /api/admin/users. The role is never taken from the request.
   */
  public signup = async (req: Request, res: Response): Promise<void> => {
    try {
      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      const password = typeof req.body?.password === 'string' ? req.body.password : '';

      const countRows = await executeQuery<any>(`SELECT COUNT(*) AS cnt FROM users`);
      if (Number(countRows[0]?.cnt) > 0) {
        res.status(403).json({
          success: false,
          message: 'Self-registration is disabled. Ask a system administrator to create your account.',
        });
        return;
      }

      if (!name || !EMAIL_RE.test(email)) {
        res.status(400).json({ success: false, message: 'A name and a valid email address are required.' });
        return;
      }
      if (password.length < MIN_PASSWORD_LENGTH) {
        res.status(400).json({ success: false, message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
        return;
      }

      const id = newUserId();
      const hash = await bcrypt.hash(password, config.auth.bcryptRounds);
      await executeQuery(
        `INSERT INTO users (id, name, email, password_hash, role, branch, status) VALUES (?, ?, ?, ?, 'Director', 'All Branches', 'Active')`,
        [id, name, email, hash]
      );
      const permissions = await loadPermissionsForRole('Director');

      auditRepository.logAction({ user: name, action: 'USER_BOOTSTRAP_SIGNUP', entity: 'users', entityId: id, newValue: { email, role: 'Director' } });

      res.status(201).json({
        success: true,
        token: signToken({ id, email, role: 'Director' }),
        user: { id, name, email, role: 'Director', branch: 'All Branches', status: 'Active', permissions },
      });
    } catch (err: any) {
      console.error('Signup Error:', err.message);
      res.status(500).json({ success: false, message: 'Server error creating user' });
    }
  };

  /** Mounted behind `authenticate`; returns the freshly loaded user. */
  public getCurrentUser = async (req: Request, res: Response): Promise<void> => {
    const u = req.user!;
    const rows = await executeQuery<any>(`SELECT profile_photo AS profilePhoto FROM users WHERE id = ? LIMIT 1`, [u.id]);
    res.json({
      success: true,
      user: {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        branch: u.branch,
        status: u.status,
        profilePhoto: rows[0]?.profilePhoto ?? null,
        permissions: u.permissions,
      },
    });
  };

  public logout = async (_req: Request, res: Response): Promise<void> => {
    res.json({ success: true, message: 'Logged out successfully.' });
  };

  /** Public branding endpoint to supply business identity, logo, and theme color before login. */
  public getPublicBranding = async (_req: Request, res: Response): Promise<void> => {
    try {
      const rows = await executeQuery<any>(
        `SELECT business_name AS businessName, business_logo AS businessLogo, primary_color AS primaryColor, director_name AS directorName, director_photo AS directorPhoto FROM business_settings WHERE id = 1 LIMIT 1`
      );
      const branding = (rows && rows[0]) || {
        businessName: 'Nexus ERP',
        businessLogo: '',
        primaryColor: '#1C64FF',
        directorName: 'Dominion',
        directorPhoto: '',
      };
      res.json({
        success: true,
        branding: {
          businessName: branding.businessName || 'Nexus ERP',
          businessLogo: branding.businessLogo || '',
          primaryColor: branding.primaryColor || '#1C64FF',
          directorName: branding.directorName || 'Dominion',
          directorPhoto: branding.directorPhoto || '',
        },
      });
    } catch (_err) {
      res.json({
        success: true,
        branding: {
          businessName: 'Nexus ERP',
          businessLogo: '',
          primaryColor: '#1C64FF',
          directorName: 'Dominion',
          directorPhoto: '',
        },
      });
    }
  };
}

export const authController = new AuthController();
