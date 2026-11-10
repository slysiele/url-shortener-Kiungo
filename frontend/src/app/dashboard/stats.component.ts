import { ChangeDetectionStrategy, Component, computed, inject, input, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Link, Metric, Stats } from '../core/models';
import { AreaChartComponent, BarListComponent } from '../shared/charts';
import { compact, delta, shortDate } from '../shared/format';
import { IconComponent } from '../shared/icon.component';

/** Account statistics at /app/statistics, or one link's statistics at /app/links/:id. */
@Component({
  selector: 'k-stats',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, AreaChartComponent, BarListComponent, IconComponent],
  template: `
    <div class="page-head">
      <div>
        @if (link(); as l) {
          <a routerLink="/app/links" class="back small">All links</a>
          <h2 class="mono">{{ display(l.shortUrl) }}</h2>
          <p>{{ l.title || l.originalUrl }}</p><p class="small">Created {{ date(l.createdAt) }}</p>
        } @else {
          <h2>Statistics</h2>
          <p>How your links performed over the last {{ days() }} days, compared with the {{ days() }} days before.</p>
        }
      </div>
      <div class="controls">
        <label class="check"><input type="checkbox" [ngModel]="humanOnly()" (ngModelChange)="humanOnly.set($event); load()" />Humans only</label>
        <select class="input" [ngModel]="days()" (ngModelChange)="days.set(+$event); load()" aria-label="Period">
          <option [ngValue]="7">Last 7 days</option>
          <option [ngValue]="30">Last 30 days</option>
          <option [ngValue]="90">Last 90 days</option>
          <option [ngValue]="365">Last 12 months</option>
        </select>
        <button class="btn icon" (click)="load()" aria-label="Refresh"><k-icon name="refresh" /></button>
      </div>
    </div>

    @if (stats(); as s) {
      @if (s.clampedByPlan) {
        <p class="notice">Your plan keeps {{ s.days }} days of history, so this shows the last {{ s.days }} days. <a routerLink="/app/billing">Upgrade for more.</a></p>
      }

      <section class="kpis panel">
        @for (k of kpis(); track k.label) {
          <div class="kpi">
            <span class="muted small">{{ k.label }}</span>
            <strong>{{ k.value }}</strong>
            @if (k.change !== null) {
              <span class="chg" [class.up]="k.change >= 0" [class.down]="k.change < 0">{{ k.change >= 0 ? '+' : '' }}{{ k.change }}{{ k.change === 999 ? '+' : '' }}% vs previous</span>
            } @else {
              <span class="chg muted">No earlier data</span>
            }
          </div>
        }
      </section>

      <section class="panel chart">
        <div class="chart-head"><h3>Clicks per day</h3></div>
        <k-area-chart [points]="s.series" />
      </section>

      <section class="grid">
        @if (!linkId()) { <k-bar-list title="Top links" [items]="s.topLinks" [mono]="true" /> }
        <k-bar-list title="Countries" [items]="s.countries" />
        <k-bar-list title="Cities" [items]="s.cities" />
        <k-bar-list title="Referrers" [items]="s.referrers" />
        <k-bar-list title="Browsers" [items]="s.browsers" />
        <k-bar-list title="Operating systems" [items]="s.os" />
        <k-bar-list title="Devices" [items]="s.devices" />
        <k-bar-list title="Campaign sources" [items]="s.utmSources" />
        <k-bar-list title="Campaign names" [items]="s.utmCampaigns" />
      </section>
      <p class="muted small foot">Country and city come from your CDN (for example Cloudflare). Without one they show as Unknown. See docs/DEPLOYMENT.md.</p>
    } @else {
      <div class="empty"><p>Crunching numbers…</p></div>
    }
  `,
  styles: `
    .back { color: var(--muted); text-decoration: none; display: inline-block; margin-bottom: .3rem; }
    .back::before { content: '‹ '; }
    .controls { display: flex; align-items: center; gap: .75rem; }
    .controls select { width: auto; }
    .notice { background: var(--accent-soft); color: var(--ink); padding: .7rem 1rem; border-radius: var(--r-md); margin-bottom: 1rem; font-size: .9rem; }
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); margin-bottom: 1rem; }
    .kpi { padding: 1.1rem 1.25rem; display: grid; gap: .2rem; }
    .kpi + .kpi { border-left: 1px solid var(--line); }
    .kpi strong { font: 800 2rem var(--font-display); letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
    .chg { font-size: .8rem; font-weight: 600; }
    .chg.up { color: var(--good); }
    .chg.down { color: var(--bad); }
    .chart { padding: 1.1rem 1.25rem 1.25rem; margin-bottom: 1rem; }
    .chart-head { margin-bottom: 1rem; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
    .foot { margin-top: 1rem; }
    @media (max-width: 1000px) { .grid { grid-template-columns: 1fr 1fr; } .kpis { grid-template-columns: 1fr 1fr; } .kpi:nth-child(3) { border-left: 0; } .kpi:nth-child(n+3) { border-top: 1px solid var(--line); } }
    @media (max-width: 600px) { .grid { grid-template-columns: 1fr; } }
  `,
})
export class StatsComponent implements OnInit {
  /** Bound from the :id route param via withComponentInputBinding(). */
  id = input<string | undefined>(undefined);
  private api = inject(ApiService);

  stats = signal<Stats | null>(null);
  link = signal<Link | null>(null);
  days = signal(30);
  humanOnly = signal(false);
  date = shortDate;

  linkId = computed(() => (this.id() ? Number(this.id()) : undefined));

  kpis = computed(() => {
    const o = this.stats()?.overview;
    if (!o) return [];
    const k = (label: string, m: Metric) => ({ label, value: compact(m.current), change: delta(m.current, m.previous) });
    const list = [
      k('Total clicks', o.totalClicks),
      k('Human clicks', o.humanClicks),
      k('Unique visitors', o.uniqueVisitors),
    ];
    list.push(this.linkId()
      ? { label: 'All-time clicks', value: compact(this.link()?.clickCount ?? 0), change: null }
      : k('Links created', o.linksCreated));
    return list;
  });

  ngOnInit() {
    const id = this.linkId();
    if (id) this.api.link(id).subscribe(l => this.link.set(l));
    this.load();
  }

  load() {
    this.api.stats(this.days(), this.linkId(), this.humanOnly()).subscribe(s => this.stats.set(s));
  }

  display(u: string) { return u.replace(/^https?:\/\//, ''); }
}
