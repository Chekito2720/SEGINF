import { HttpInterceptorFn } from '@angular/common/http';

const TOKEN_COOKIE = 'miapp_token';

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

/**
 * Interceptor de autenticación.
 * Lee el JWT de la cookie "miapp_token" y lo agrega como
 * Authorization: Bearer <token> en cada request al API Gateway.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = getCookie(TOKEN_COOKIE);
  if (!token) return next(req);

  const authReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });
  return next(authReq);
};
