import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { errorMessage } from '../core/auth.interceptor';
import { AuthService } from '../core/auth.service';
import { LogoComponent } from '../shared/icon.component';

/** Sign in and sign up share one screen; the route data decides which. */
@Component({
  selector: 'k-auth',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, LogoComponent],
  template: `
    <main>
      <a routerLink="/" class="home"><k-logo /></a>
      <form class="panel" (ngSubmit)="submit()">
        <h2>{{ isRegister() ? 'Create your account' : 'Sign in' }}</h2>
        <p class="muted">{{ isRegister() ? 'You get 14 days of Pro free. No card needed.' : 'Welcome back.' }}</p>

        @if (isRegister()) {
          <label class="field"><span>Name</span>
            <input class="input" name="name" [(ngModel)]="name" autocomplete="name" placeholder="Wanjiku Kamau" />
          </label>
        }
        <label class="field"><span>Email</span>
          <input class="input" name="email" type="email" [(ngModel)]="email" required autocomplete="email" placeholder="you@business.co.ke" />
        </label>
        <label class="field"><span>Password</span>
          <input class="input" name="password" type="password" [(ngModel)]="password" required
                 [attr.autocomplete]="isRegister() ? 'new-password' : 'current-password'" />
          @if (isRegister()) { <small>At least 8 characters.</small> }
        </label>

        @if (error()) { <p class="err" role="alert">{{ error() }}</p> }

        <button class="btn primary lg" type="submit" [disabled]="busy()">
          {{ busy() ? 'Just a moment…' : isRegister() ? 'Create account' : 'Sign in' }}
        </button>

        @if (isRegister()) {
          <p class="switch muted small">Already have an account? <a routerLink="/login">Sign in</a></p>
        } @else {
          <p class="switch muted small">New to Kiungo? <a routerLink="/register" [queryParams]="pendingUrl() ? { url: pendingUrl() } : {}">Create an account</a></p>
          <p class="demo muted small">Running locally? Try <span class="mono">demo&#64;kiungo.dev</span> / <span class="mono">demo1234</span>.</p>
        }
      </form>
    </main>
  `,
  styles: `
    main { min-height: 100vh; display: grid; place-content: center; justify-items: center; gap: 1.5rem; padding: 2rem 1rem; }
    .home { text-decoration: none; }
    form { width: min(400px, 92vw); padding: 2rem; display: grid; gap: 1rem; }
    .err { color: var(--bad); font-size: .9rem; }
    .switch, .demo { text-align: center; }
  `,
})
export class AuthComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private data = toSignal(this.route.data, { initialValue: {} as Record<string, unknown> });
  isRegister = computed(() => this.data()['mode'] === 'register');
  pendingUrl = signal<string | null>(this.route.snapshot.queryParamMap.get('url'));

  name = '';
  email = '';
  password = '';
  busy = signal(false);
  error = signal<string | null>(null);

  submit() {
    this.error.set(null);
    this.busy.set(true);
    const req = this.isRegister()
      ? this.auth.register(this.email, this.password, this.name || undefined)
      : this.auth.login(this.email, this.password);
    req.subscribe({
      next: () => {
        const url = this.pendingUrl();
        this.router.navigate(['/app/links'], { queryParams: url ? { url } : {} });
      },
      error: err => {
        this.error.set(errorMessage(err, 'Could not sign you in'));
        this.busy.set(false);
      },
    });
  }
}
