// ═══════════════════════════════════════════════════════════════════
// JwtService  —  decode-only (el servidor genera y valida el token)
// ═══════════════════════════════════════════════════════════════════
import { Injectable } from '@angular/core';
import { JwtPayload } from '../models/Auth.model';

export type { JwtPayload };

@Injectable({ providedIn: 'root' })
export class JwtService {

  /** Decodifica el payload sin verificar firma (confiamos en el servidor). */
  decode(token: string): JwtPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const pad    = parts[1].length % 4;
      const padded = pad ? parts[1] + '='.repeat(4 - pad) : parts[1];
      const json   = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(json) as JwtPayload;
    } catch {
      return null;
    }
  }

  /** True si el token ha expirado (exp en segundos, estándar JWT). */
  isExpired(token: string): boolean {
    const p = this.decode(token);
    if (!p) return true;
    const expMs = p.exp < 1e12 ? p.exp * 1000 : p.exp;
    return Date.now() > expMs;
  }

  /** Minutos restantes de validez. */
  minutesLeft(token: string): number {
    const p = this.decode(token);
    if (!p) return 0;
    const expMs = p.exp < 1e12 ? p.exp * 1000 : p.exp;
    return Math.max(0, Math.round((expMs - Date.now()) / 60_000));
  }
}
