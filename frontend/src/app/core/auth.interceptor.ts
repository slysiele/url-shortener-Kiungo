import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

/** Adds the JWT, signs out on 401 and turns 402 (plan limit) into an upgrade prompt. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const toast = inject(ToastService);
  const token = auth.token();
  const authed = token && req.url.startsWith('/api') ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authed).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && token && !req.url.includes('/auth/login')) {
        toast.show('Your session ended. Sign in again to continue.');
        auth.logout();
      } else if (err.status === 402) {
        toast.show(err.error?.message ?? 'Your plan does not include this.', 'upgrade', 7000);
      } else if (err.status === 0) {
        toast.error("Can't reach the server. Check that the backend is running.");
      }
      return throwError(() => err);
    }),
  );
};

/** Pulls a readable message out of an API error. */
export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  const e = err as HttpErrorResponse;
  if (e?.error?.fields) {
    const [field, msg] = Object.entries(e.error.fields as Record<string, string>)[0];
    return `${field}: ${msg}`;
  }
  return e?.error?.message ?? fallback;
}
