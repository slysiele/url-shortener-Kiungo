import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { errorMessage } from '../core/auth.interceptor';
import { AuthService } from '../core/auth.service';
import { THEMES, ThemeService } from '../core/theme.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'k-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="page-head"><div><h2>Settings</h2><p>Your profile, look and password.</p></div></div>

    <section class="panel">
      <div class="panel-head"><h3>Theme</h3></div>
      <div class="panel-body themes" role="radiogroup" aria-label="Theme">
        @for (t of themes; track t.id) {
          <button role="radio" [attr.aria-checked]="theme.current() === t.id" [class.on]="theme.current() === t.id" (click)="pickTheme(t.id)">
            <span class="sw" [style.background]="t.swatch[0]">
              <i [style.background]="t.swatch[1]"></i><i [style.background]="t.swatch[2]"></i>
            </span>
            <strong>{{ t.name }}</strong>
            <span class="muted small">{{ t.note }}</span>
          </button>
        }
      </div>
    </section>

    <div class="cols">
      <form class="panel" (ngSubmit)="saveProfile()">
        <div class="panel-head"><h3>Profile</h3></div>
        <div class="panel-body body">
          <label class="field"><span>Name</span><input class="input" name="name" [(ngModel)]="name" /></label>
          <label class="field"><span>Email</span><input class="input" [value]="auth.user()?.email ?? ''" disabled /></label>
          <button class="btn primary" type="submit">Save profile</button>
        </div>
      </form>

      <form class="panel" (ngSubmit)="changePassword()">
        <div class="panel-head"><h3>Password</h3></div>
        <div class="panel-body body">
          <label class="field"><span>Current password</span><input class="input" type="password" name="cur" [(ngModel)]="current" autocomplete="current-password" /></label>
          <label class="field"><span>New password</span><input class="input" type="password" name="new" [(ngModel)]="next" autocomplete="new-password" /><small>At least 8 characters.</small></label>
          @if (pwError()) { <p class="err">{{ pwError() }}</p> }
          <button class="btn" type="submit" [disabled]="!current || next.length < 8">Change password</button>
        </div>
      </form>
    </div>
  `,
  styles: `
    .themes { display: grid; grid-template-columns: repeat(4, 1fr); gap: .75rem; }
    .themes button { display: grid; gap: .3rem; text-align: left; background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-md);
      padding: .75rem; cursor: pointer; color: var(--ink); font: inherit; }
    .themes button.on { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
    .sw { height: 56px; border-radius: var(--r-sm); display: flex; align-items: flex-end; gap: 6px; padding: 8px; border: 1px solid rgba(128,128,128,.25); margin-bottom: .3rem; }
    .sw i { width: 22px; height: 22px; border-radius: 50%; }
    .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; align-items: start; }
    .body { display: grid; gap: 1rem; justify-items: start; }
    .body .field { width: 100%; }
    .err { color: var(--bad); font-size: .9rem; }
    @media (max-width: 860px) { .themes { grid-template-columns: 1fr 1fr; } .cols { grid-template-columns: 1fr; } }
  `,
})
export class SettingsComponent {
  auth = inject(AuthService);
  theme = inject(ThemeService);
  private api = inject(ApiService);
  private toast = inject(ToastService);
  themes = THEMES;
  name = this.auth.user()?.name ?? '';
  current = '';
  next = '';
  pwError = signal<string | null>(null);

  constructor() {
    effect(() => { const n = this.auth.user()?.name; if (n && !this.name) this.name = n; });
  }

  pickTheme(id: string) {
    this.theme.apply(id);
    this.api.updateMe({ theme: id }).subscribe(p => this.auth.user.set(p)); // remembered across devices
  }

  saveProfile() {
    this.api.updateMe({ name: this.name }).subscribe(p => { this.auth.user.set(p); this.toast.show('Profile saved'); });
  }

  changePassword() {
    this.pwError.set(null);
    this.api.changePassword({ currentPassword: this.current, newPassword: this.next }).subscribe({
      next: () => { this.current = ''; this.next = ''; this.toast.show('Password changed'); },
      error: e => this.pwError.set(errorMessage(e)),
    });
  }
}
