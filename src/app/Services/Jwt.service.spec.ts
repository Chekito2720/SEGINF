import { TestBed }   from '@angular/core/testing';
import { JwtService, JwtPayload } from './Jwt.service';

const SAMPLE_PAYLOAD: Omit<JwtPayload, 'iat' | 'exp'> = {
  sub:         1,
  username:    'superadmin',
  email:       'admin@miapp.com',
  fullName:    'Super Admin',
  groupIds:    [1, 2, 3],
  permissions: ['ticket_view', 'user_view', 'ticket_edit'],
};

describe('JwtService', () => {
  let svc: JwtService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    svc = TestBed.inject(JwtService);
  });

  // ── Generación ────────────────────────────────────────────────────
  describe('generate()', () => {
    it('returns a 3-part dot-separated string', () => {
      const token = svc.generate(SAMPLE_PAYLOAD);
      expect(token.split('.').length).toBe(3);
    });

    it('includes iat and exp in payload', () => {
      const token   = svc.generate(SAMPLE_PAYLOAD);
      const decoded = svc.decode(token)!;
      expect(decoded.iat).toBeTruthy();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });

    it('exp is ~8h after iat', () => {
      const token   = svc.generate(SAMPLE_PAYLOAD);
      const decoded = svc.decode(token)!;
      const diff    = decoded.exp - decoded.iat;
      expect(diff).toBeCloseTo(8 * 60 * 60 * 1000, -4);
    });

    it('encodes sub correctly', () => {
      const token = svc.generate(SAMPLE_PAYLOAD);
      expect(svc.decode(token)!.sub).toBe(1);
    });

    it('encodes permissions array', () => {
      const token = svc.generate(SAMPLE_PAYLOAD);
      expect(svc.decode(token)!.permissions).toEqual(SAMPLE_PAYLOAD.permissions);
    });

    it('encodes groupIds array', () => {
      const token = svc.generate(SAMPLE_PAYLOAD);
      expect(svc.decode(token)!.groupIds).toEqual([1, 2, 3]);
    });
  });

  // ── Verificación ──────────────────────────────────────────────────
  describe('verify()', () => {
    it('returns payload for a valid token', () => {
      const token   = svc.generate(SAMPLE_PAYLOAD);
      const payload = svc.verify(token);
      expect(payload).not.toBeNull();
      expect(payload!.sub).toBe(1);
    });

    it('returns null for a tampered payload', () => {
      const parts    = svc.generate(SAMPLE_PAYLOAD).split('.');
      const decoded  = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));
      decoded.sub    = 999;
      const tampered = decoded;
      const fakeBody = btoa(JSON.stringify(tampered)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
      const bad      = `${parts[0]}.${fakeBody}.${parts[2]}`;
      expect(svc.verify(bad)).toBeNull();
    });

    it('returns null for a token with wrong number of parts', () => {
      expect(svc.verify('only.two')).toBeNull();
    });

    it('returns null for an empty string', () => {
      expect(svc.verify('')).toBeNull();
    });

    it('returns null for an expired token', () => {
      const token   = svc.generate(SAMPLE_PAYLOAD);
      const payload = svc.decode(token)!;
      // Manually craft expired token by setting exp in the past
      const expired: JwtPayload = { ...payload, exp: Date.now() - 1000 };

      // Re-encode without going through generate (no valid sig) — just test expiry path
      // Use a fresh generate approach: mock Date.now temporarily
      const realNow = Date.now;
      Date.now = () => realNow() + 9 * 60 * 60 * 1000; // advance 9h
      try {
        expect(svc.verify(token)).toBeNull();
      } finally {
        Date.now = realNow;
      }
    });

    it('returns permissions from payload', () => {
      const token   = svc.generate(SAMPLE_PAYLOAD);
      const payload = svc.verify(token)!;
      expect(payload.permissions).toEqual(SAMPLE_PAYLOAD.permissions);
    });
  });

  // ── Decodificación ────────────────────────────────────────────────
  describe('decode()', () => {
    it('decodes without verifying signature', () => {
      const token = svc.generate(SAMPLE_PAYLOAD);
      expect(svc.decode(token)?.email).toBe('admin@miapp.com');
    });

    it('returns null for garbage input', () => {
      expect(svc.decode('not-a-jwt-at-all')).toBeNull();
    });
  });

  // ── minutesLeft ───────────────────────────────────────────────────
  describe('minutesLeft()', () => {
    it('returns ~480 minutes for a fresh token', () => {
      const token = svc.generate(SAMPLE_PAYLOAD);
      expect(svc.minutesLeft(token)).toBeGreaterThanOrEqual(479);
      expect(svc.minutesLeft(token)).toBeLessThanOrEqual(481);
    });

    it('returns 0 for invalid token', () => {
      expect(svc.minutesLeft('bad')).toBe(0);
    });
  });
});