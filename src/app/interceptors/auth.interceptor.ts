import { HttpInterceptorFn } from '@angular/common/http';

const TOKEN_COOKIE = 'miapp_token';
const GROUP_COOKIE = 'miapp_group';

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

/**
 * Interceptor de autenticación.
 * - Adjunta Authorization: Bearer <token>
 * - Adjunta x-group-id con el grupo activo leído directo de cookie
 *   (evita dependencia circular con AuthService → GroupService → HttpClient)
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = getCookie(TOKEN_COOKIE);
  if (!token) return next(req);

  const groupId = getCookie(GROUP_COOKIE);

  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (groupId) headers['x-group-id'] = groupId;

  return next(req.clone({ setHeaders: headers }));
};