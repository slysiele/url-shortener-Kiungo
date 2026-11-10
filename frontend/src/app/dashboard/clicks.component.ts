import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { ClickEvent, Page } from '../core/models';
import { ago } from '../shared/format';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'k-clicks',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IconComponent],
  template: `
    <div class="page-head">
      <div>
        <h2>Click stream</h2>
        <p>Every visit as it happens, newest first.</p>
      </div>
      <div class="controls">
        <label class="check"><input type="checkbox" [ngModel]="live()" (ngModelChange)="setLive($event)" />Refresh every 10 seconds</label>
        <button class="btn icon" (click)="load()" aria-label="Refresh"><k-icon name="refresh" /></button>
      </div>
    </div>
    <div class="panel">
      @if (page(); as p) {
        @if (p.items.length) {
          <div class="table-wrap">
            <table class="data">
              <thead><tr><th>Short link</th><th>When</th><th>Visitor</th><th>Country</th><th>Referrer</th><th>Campaign</th><th>Browser</th><th>Device</th></tr></thead>
              <tbody>
                @for (c of p.items; track c.id) {
                  <tr>
                    <td class="mono slug">/{{ c.slug }}</td>
                    <td class="nowrap" [title]="c.clickedAt">{{ ago(c.clickedAt) }}</td>
                    <td><span class="pill" [class.good]="!c.bot">{{ c.bot ? 'Bot' : 'Human' }}</span></td>
                    <td>{{ c.country ?? '—' }}@if (c.city) {<span class="muted">, {{ c.city }}</span>}</td>
                    <td>{{ c.referrer ?? '—' }}</td>
                    <td>{{ c.utmSource ?? '—' }}</td>
                    <td class="nowrap">{{ c.browser }}</td>
                    <td class="muted">{{ c.device }} · {{ c.os }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="pager">
            <button class="btn" [disabled]="p.page === 0" (click)="go(p.page - 1)">Newer</button>
            <span class="muted small">{{ p.total }} clicks in total</span>
            <button class="btn" [disabled]="p.page + 1 >= p.totalPages" (click)="go(p.page + 1)">Older</button>
          </div>
        } @else {
          <div class="empty"><h3>No clicks yet</h3><p>Share one of your links and visits will appear here within seconds.</p></div>
        }
      }
    </div>
  `,
  styles: `
    .controls { display: flex; align-items: center; gap: .75rem; }
    .slug { color: var(--accent); }
    .nowrap { white-space: nowrap; }
    .pager { display: flex; justify-content: center; align-items: center; gap: 1rem; padding: 1rem; border-top: 1px solid var(--line); }
  `,
})
export class ClicksComponent {
  private api = inject(ApiService);
  page = signal<Page<ClickEvent> | null>(null);
  pageNo = signal(0);
  live = signal(false);
  ago = ago;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.load();
    inject(DestroyRef).onDestroy(() => this.setLive(false));
  }

  load() { this.api.clicks(this.pageNo()).subscribe(p => this.page.set(p)); }
  go(n: number) { this.pageNo.set(n); this.load(); }

  setLive(on: boolean) {
    this.live.set(on);
    if (this.timer) clearInterval(this.timer);
    this.timer = on ? setInterval(() => { if (this.pageNo() === 0) this.load(); }, 10_000) : null;
  }
}
