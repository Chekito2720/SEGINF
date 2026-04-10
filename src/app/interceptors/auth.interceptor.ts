import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../Services/Auth.service';

const TOKEN_COOKIE = 'miapp_token';

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

/**
 * Interceptor de autenticación.
 * - Adjunta Authorization: Bearer <token>
 * - Adjunta x-group-id con el grupo activo para que el gateway
 *   pueda verificar permisos contextuales del grupo.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = getCookie(TOKEN_COOKIE);
  if (!token) return next(req);

  const authSvc = inject(AuthService);
  const group   = authSvc.getGroup();

  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (group?.id) headers['x-group-id'] = group.id;

  return next(req.clone({ setHeaders: headers }));
};
