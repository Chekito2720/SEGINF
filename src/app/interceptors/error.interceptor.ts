import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError(err => {
      if (err.status === 401) {
        // Token inválido o expirado: limpiar cookie y redirigir al login
        document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'miapp_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        // Solo redirigir si no estamos ya en el login
        if (!router.url.startsWith('/auth/login')) {
          router.navigate(['/auth/login']);
        }
      }

      // Enriquecer el error con el mensaje del backend para que los componentes lo muestren
      const backendMessage =
        err.error?.message ??
        (err.status === 403  ? 'No tienes permiso para realizar esta acción.'    :
         err.status === 429  ? 'Has superado el límite de peticiones. Espera un momento.' :
         err.status === 404  ? 'El recurso solicitado no existe.'                :
         err.status >= 500   ? 'Error interno del servidor. Intenta más tarde.'  :
         'Error de red.');

      return throwError(() => ({ ...err, userMessage: backendMessage }));
    }),
  );
};
