import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ApiService } from '../core/api.service';
import { errorMessage } from '../core/auth.interceptor';
import { AuthService } from '../core/auth.service';
import { LinksBus } from '../core/links-bus.service';
import { ToastService } from '../core/toast.service';
import { copyText } from '../shared/format';
import { IconComponent, LogoComponent } from '../shared/icon.component';

const NAV = [
  { path: 'links', label: 'Links', icon: 'link' },
  { path: 'statistics', label: 'Statistics', icon: 'chart' },
  { path: 'clicks', label: 'Click stream', icon: 'stream' },
  { path: 'import', label: 'Import & export', icon: 'upload' },
  { path: 'api', label: 'Integrations & API', icon: 'key' },
  { path: 'billing', label: 'Plan & billing', icon: 'card' },
  { path: 'settings', label: 'Settings', icon: 'settings' },
];

@Component({
  selector: 'k-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule, IconComponent, LogoComponent],
  template: `
    <aside [class.open]="menuOpen()">
      <a routerLink="/app/links" class="brand"><k-logo /></a>
      <nav>
        @for (n of nav; track n.path) {
          <a [routerLink]="n.path" routerLinkActive="active" (click)="menuOpen.set(false)">
            <k-icon [name]="n.icon" />{{ n.label }}
          </a>
        }
      </nav>

      @if (auth.user(); as u) {
        <div class="plan">
          <div class="plan-row">
            <strong>{{ planName(u.effectivePlan) }}</strong>
            @if (u.onTrial) { <span class="pill accent">Trial, {{ trialDaysLeft() }} days left</span> }
          </div>
          @if (u.usage.linksPerMonthLimit > 0) {
            <div class="meter" [attr.aria-label]="u.usage.linksThisMonth + ' of ' + u.usage.linksPerMonthLimit + ' links used'">
              <div [style.width.%]="usagePct()" [class.warn]="usagePct() > 85"></div>
            </div>
            <span class="muted small">{{ u.usage.linksThisMonth }} of {{ u.usage.linksPerMonthLimit }} links this month</span>
          } @else {
            <span class="muted small">Unlimited links</span>
          }
          @if (u.plan === 'FREE') {
            <a class="btn primary" routerLink="billing" (click)="menuOpen.set(false)">Upgrade</a>
          }
        </div>
      }
    </aside>
    @if (menuOpen()) { <div class="scrim" (click)="menuOpen.set(false)"></div> }

    <div class="main">
      <header>
        <button class="btn icon menu" (click)="menuOpen.set(true)" aria-label="Open menu"><k-icon name="menu" /></button>
        <form class="quick" (ngSubmit)="quickShorten()">
          <k-icon name="link" />
          <input name="quick" [(ngModel)]="quickUrl" placeholder="Paste a link and press Enter to shorten" autocomplete="off" aria-label="Paste a link to shorten" />
          @if (quickUrl) { <button class="btn primary" type="submit" [disabled]="quickBusy()">Shorten</button> }
        </form>
        <div class="user">
          <span class="muted small email">{{ auth.user()?.email }}</span>
          <button class="btn icon" (click)="auth.logout()" aria-label="Sign out" title="Sign out"><k-icon name="logout" /></button>
        </div>
      </header>
      <main><router-outlet /></main>
    </div>
  `,
  styles: `
    :host { display: grid; grid-template-columns: 248px 1fr; min-height: 100vh; }
    aside { position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column; gap: 1.5rem; padding: 1.1rem .9rem;
      border-right: 1px solid var(--line); background: var(--surface); }
    .brand { text-decoration: none; padding: .2rem .5rem; }
    nav { display: grid; gap: 2px; }
    nav a { display: flex; align-items: center; gap: .7rem; padding: .55rem .65rem; border-radius: var(--r-sm); color: var(--muted);
      text-decoration: none; font-weight: 500; font-size: .92rem; }
    nav a:hover { color: var(--ink); background: var(--surface-2); }
    nav a.active { color: var(--accent); background: var(--accent-soft); font-weight: 600; }
    .plan { margin-top: auto; display: grid; gap: .5rem; padding: .9rem; border: 1px solid var(--line); border-radius: var(--r-md); background: var(--surface-2); }
    .plan-row { display: flex; justify-content: space-between; align-items: center; gap: .5rem; }
    .meter { height: 6px; border-radius: 3px; background: var(--line); overflow: hidden; }
    .meter div { height: 100%; background: var(--accent); border-radius: 3px; }
    .meter div.warn { background: var(--gold); }

    .main { min-width: 0; display: flex; flex-direction: column; }
    header { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; gap: 1rem; padding: .7rem 1.5rem;
      background: color-mix(in srgb, var(--bg) 88%, transparent); backdrop-filter: blur(8px); border-bottom: 1px solid var(--line); }
    .quick { flex: 1; max-width: 640px; display: flex; align-items: center; gap: .5rem; background: var(--surface); border: 1px solid var(--line);
      border-radius: var(--r-md); padding: .3rem .35rem .3rem .8rem; color: var(--muted); }
    .quick:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
    .quick input { flex: 1; border: 0; background: transparent; color: var(--ink); font: inherit; padding: .35rem 0; outline: none; min-width: 0; }
    .user { margin-left: auto; display: flex; align-items: center; gap: .5rem; }
    main { padding: 1.75rem 1.5rem 3rem; max-width: 1240px; width: 100%; }
    .menu, .scrim { display: none; }

    @media (max-width: 900px) {
      :host { grid-template-columns: 1fr; }
      aside { position: fixed; left: 0; z-index: 40; width: 260px; transform: translateX(-100%); transition: transform .2s; }
      aside.open { transform: none; box-shadow: var(--shadow); }
      .scrim { display: block; position: fixed; inset: 0; background: rgba(0,0,0,.35); z-index: 30; }
      .menu { display: inline-flex; }
      .email { display: none; }
      header { padding: .6rem 1rem; }
      main { padding: 1.25rem 1rem 3rem; }
    }
  `,
})
export class ShellComponent {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private bus = inject(LinksBus);
  private router = inject(Router);
  nav = NAV;
  menuOpen = signal(false);
  quickUrl = '';
  quickBusy = signal(false);

  usagePct = computed(() => {
    const u = this.auth.user()?.usage;
    return u && u.linksPerMonthLimit > 0 ? Math.min(100, (u.linksThisMonth / u.linksPerMonthLimit) * 100) : 0;
  });

  trialDaysLeft = computed(() => {
    const t = this.auth.user()?.trialEndsAt;
    return t ? Math.max(0, Math.ceil((new Date(t).getTime() - Date.now()) / 86_400_000)) : 0;
  });

  constructor() {
    this.auth.refresh();
    // Arriving from the landing page with ?url=… → shorten it straight away
    const pending = inject(ActivatedRoute).snapshot.queryParamMap.get('url');
    if (pending) {
      this.quickUrl = pending;
      this.quickShorten();
      this.router.navigate([], { queryParams: {}, replaceUrl: true });
    }
  }

  planName(p: string) { return p.charAt(0) + p.slice(1).toLowerCase(); }

  quickShorten() {
    const url = this.quickUrl.trim();
    if (!url) return;
    this.quickBusy.set(true);
    this.api.createLink({ url }).subscribe({
      next: async link => {
        this.quickUrl = '';
        this.quickBusy.set(false);
        this.bus.created.set(link);
        this.auth.refresh();
        const copied = await copyText(link.shortUrl);
        this.toast.show(copied ? `${link.shortUrl} copied to clipboard` : `Created ${link.shortUrl}`);
      },
      error: err => {
        this.quickBusy.set(false);
        if (err.status !== 402) this.toast.error(errorMessage(err, 'Could not shorten that link'));
      },
    });
  }
}
