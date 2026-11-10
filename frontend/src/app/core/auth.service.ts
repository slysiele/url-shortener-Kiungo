import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { AuthResponse, Profile } from './models';
import { ThemeService } from './theme.service';

const TOKEN_KEY = 'kiungo.token';

function readToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);
  private theme = inject(ThemeService);

  readonly token = signal<string | null>(readToken());
  readonly user = signal<Profile | null>(null);
  readonly isLoggedIn = computed(() => !!this.token());

  login(email: string, password: string): Observable<AuthResponse> {
    return this.api.login({ email, password }).pipe(tap(r => this.accept(r)));
  }

  register(email: string, password: string, name?: string): Observable<AuthResponse> {
    return this.api.register({ email, password, name }).pipe(tap(r => this.accept(r)));
  }

  /** Re-reads plan/usage after anything that changes them (creating links, upgrading…). */
  refresh() {
    if (!this.token()) return;
    this.api.me().subscribe({ next: u => this.setUser(u), error: () => {} });
  }

  setUser(u: Profile) {
    this.user.set(u);
    if (u.theme) this.theme.apply(u.theme);
  }

  logout() {
    this.token.set(null);
    this.user.set(null);
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ }
    this.router.navigateByUrl('/login');
  }

  private accept(r: AuthResponse) {
    this.token.set(r.token);
    try { localStorage.setItem(TOKEN_KEY, r.token); } catch { /* storage unavailable */ }
    this.setUser(r.user);
  }
}
