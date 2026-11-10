import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { PlanId, PlanView, PlansResponse } from '../core/models';
import { IconComponent } from './icon.component';
import { limit, money } from './format';

const BLURBS: Record<PlanId, string> = {
  FREE: 'For trying things out and personal links.',
  STARTER: 'For small businesses running SMS and social campaigns.',
  PRO: 'For marketing teams who live in their analytics.',
  BUSINESS: 'For high-volume senders and platforms built on our API.',
};

@Component({
  selector: 'k-pricing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    @if (data(); as d) {
      <div class="grid">
        @for (p of d.plans; track p.id) {
          <article [class.featured]="p.id === 'PRO'" [class.current]="p.id === current()">
            <header>
              <h3>{{ p.name }}</h3>
              @if (p.id === current()) { <span class="pill accent">Current plan</span> }
              @else if (p.id === 'PRO') { <span class="pill accent">Most popular</span> }
            </header>
            <p class="price"><strong>{{ money(p.priceUsdCents) }}</strong><span>/ month</span></p>
            <p class="blurb">{{ blurb[p.id] }}</p>
            <ul>
              <li><k-icon name="check" [size]="16" />{{ limit(p.linksPerMonth) }} links a month</li>
              <li><k-icon name="check" [size]="16" />{{ p.analyticsDays < 0 ? 'Unlimited' : p.analyticsDays + ' days of' }} analytics history</li>
              <li><k-icon name="check" [size]="16" />QR codes and click stream</li>
              <li [class.off]="!p.csvImport"><k-icon [name]="p.csvImport ? 'check' : 'close'" [size]="16" />CSV import and bulk create</li>
              <li [class.off]="!p.apiAccess"><k-icon [name]="p.apiAccess ? 'check' : 'close'" [size]="16" />
                {{ p.apiAccess ? 'API access, ' + p.apiRequestsPerMinute + ' requests/min' : 'API access' }}</li>
              <li [class.off]="!p.deviceTargeting"><k-icon [name]="p.deviceTargeting ? 'check' : 'close'" [size]="16" />iOS and Android targeting</li>
            </ul>
            <button class="btn lg" [class.primary]="p.id === 'PRO'" [disabled]="p.id === current() || busy() === p.id"
                    (click)="choose.emit(p.id)">
              {{ cta(p) }}
            </button>
          </article>
        }
      </div>
      <p class="trial muted small">Every new account gets {{ d.trialDays }} days of Pro free, no card needed. After that you drop to Free unless you choose a plan.</p>
    }
  `,
  styles: `
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
    article { background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-lg); padding: 1.35rem; display: flex; flex-direction: column; gap: .8rem; }
    article.featured { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
    header { display: flex; justify-content: space-between; align-items: center; gap: .5rem; min-height: 1.6rem; }
    .price strong { font: 800 2.3rem var(--font-display); letter-spacing: -0.03em; }
    .price span { color: var(--muted); margin-left: .3rem; }
    .blurb { color: var(--muted); font-size: .9rem; min-height: 2.7em; }
    ul { list-style: none; padding: 0; margin: 0 0 .5rem; display: grid; gap: .5rem; font-size: .9rem; flex: 1; }
    li { display: flex; gap: .5rem; align-items: flex-start; }
    li k-icon { color: var(--good); margin-top: 2px; }
    li.off { color: var(--muted); }
    li.off k-icon { color: var(--muted); }
    .trial { margin-top: 1rem; text-align: center; }
    @media (max-width: 1000px) { .grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 560px) { .grid { grid-template-columns: 1fr; } }
  `,
})
export class PricingTableComponent {
  current = input<PlanId | null>(null);
  busy = input<PlanId | null>(null);
  ctaMode = input<'signup' | 'upgrade'>('signup');
  choose = output<PlanId>();

  data = signal<PlansResponse | null>(null);
  blurb = BLURBS;
  money = money;
  limit = limit;

  constructor() {
    inject(ApiService).plans().subscribe(d => this.data.set(d));
  }

  cta(p: PlanView) {
    if (this.ctaMode() === 'signup') return p.priceUsdCents === 0 ? 'Start free' : `Start ${p.name} trial`;
    if (p.id === this.current()) return 'Current plan';
    return p.priceUsdCents === 0 ? 'Switch to Free' : `Choose ${p.name}`;
  }
}
