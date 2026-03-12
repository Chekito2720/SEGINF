// ═══════════════════════════════════════════════════════════════════
// JwtService  —  simulación de JWT sin librerías externas
//
// Formato real:  header.payload.signature  (base64url separado por .)
// La "firma" es un HMAC-SHA256 real no disponible en browser sin
// librería, así que simulamos con un hash determinista usando el
// secret + el payload. En producción se usaría jose / jsonwebtoken.
// ═══════════════════════════════════════════════════════════════════
import { Injectable } from '@angular/core';

export interface JwtPayload {
  sub:         number;        // userId
  username:    string;
  email:       string;
  fullName:    string;
  groupIds:    number[];
  permissions: string[];
  iat:         number;        // issued at  (epoch ms)
  exp:         number;        // expires at (epoch ms)
}

const SECRET = 'miapp-jwt-secret-2025';
const ALGO   = 'HS256';
const TTL_MS = 8 * 60 * 60 * 1000; // 8 horas

@Injectable({ providedIn: 'root' })
export class JwtService {

  // ── Codificación base64url (sin padding) ──────────────────────────
  private b64url(str: string): string {
    return btoa(unescape(encodeURIComponent(str)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  private decodeB64url(str: string): string {
    // Restaurar padding
    const pad = str.length % 4;
    const padded = pad ? str + '='.repeat(4 - pad) : str;
    return decodeURIComponent(escape(atob(padded.replace(/-/g, '+').replace(/_/g, '/'))));
  }

  // ── "Firma" determinista (hash djb2 sobre secret+payload) ─────────
  // No es criptográficamente seguro; sirve para detectar tampering en demo.
  private sign(data: string): string {
    const raw = SECRET + data;
    let h = 5381;
    for (let i = 0; i < raw.length; i++) {
      h = (((h << 5) + h) + raw.charCodeAt(i)) >>> 0;
    }
    return h.toString(36);
  }

  // ── Generar token ─────────────────────────────────────────────────
  generate(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    const now  = Date.now();
    const full: JwtPayload = { ...payload, iat: now, exp: now + TTL_MS };

    const header  = this.b64url(JSON.stringify({ alg: ALGO, typ: 'JWT' }));
    const body    = this.b64url(JSON.stringify(full));
    const sig     = this.b64url(this.sign(`${header}.${body}`));

    return `${header}.${body}.${sig}`;
  }

  // ── Verificar y decodificar ───────────────────────────────────────
  verify(token: string): JwtPayload | null {
    try {
      const [header, body, sig] = token.split('.');
      if (!header || !body || !sig) return null;

      // Comprobar firma
      const expected = this.b64url(this.sign(`${header}.${body}`));
      if (sig !== expected) return null;

      const payload: JwtPayload = JSON.parse(this.decodeB64url(body));

      // Comprobar expiración
      if (Date.now() > payload.exp) return null;

      return payload;
    } catch {
      return null;
    }
  }

  // ── Decodificar sin verificar (para inspección/debug) ────────────
  decode(token: string): JwtPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      return JSON.parse(this.decodeB64url(parts[1]));
    } catch {
      return null;
    }
  }

  // ── Tiempo restante en minutos ────────────────────────────────────
  minutesLeft(token: string): number {
    const p = this.decode(token);
    if (!p) return 0;
    return Math.max(0, Math.round((p.exp - Date.now()) / 60_000));
  }
}