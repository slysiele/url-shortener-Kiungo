import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '../core/api.service';
import { errorMessage } from '../core/auth.interceptor';
import { AuthService } from '../core/auth.service';
import { LinksBus } from '../core/links-bus.service';
import { Link, Page } from '../core/models';
import { ToastService } from '../core/toast.service';
import { copyText, plain, shortDate } from '../shared/format';
import { IconComponent } from '../shared/icon.component';
import { LinkEditorComponent } from './link-editor.component';
import { QrDialogComponent } from './qr-dialog.component';

const STATUS_LABEL: Record<string, string> = { ACTIVE: 'Active', DISABLED: 'Paused', EXPIRED: 'Expired', LIMIT_REACHED: 'Limit reached' };

@Component({
  selector: 'k-links',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, IconComponent, LinkEditorComponent, QrDialogComponent],
  template: `
    <div class="page-head">
      <div>
        <h2>Links</h2>
        <p>{{ page()?.total ?? 0 }} links. Copy, edit or check stats from each row.</p>
      </div>
      <button class="btn primary" (click)="openEditor(null)"><k-icon name="plus" [size]="16" />New link</button>
    </div>

    <div class="panel">
      <div class="panel-head">
        <label class="search">
          <k-icon name="search" [size]="16" />
          <input [ngModel]="query()" (ngModelChange)="search$.next($event)" placeholder="Search by slug, URL, title or tag" aria-label="Search links" />
        </label>
        <button class="btn icon" (click)="load()" aria-label="Refresh" title="Refresh"><k-icon name="refresh" /></button>
      </div>

      @if (page(); as p) {
        @if (p.items.length) {
          <div class="table-wrap">
            <table class="data">
              <thead><tr><th>Short link</th><th>Destination</th><th class="num">Clicks</th><th>Status</th><th>Created</th><th><span class="sr">Actions</span></th></tr></thead>
              <tbody>
                @for (l of p.items; track l.id) {
                  <tr [class.fresh]="l.id === freshId()">
                    <td>
                      <div class="short">
                        <a class="mono" [href]="l.shortUrl" target="_blank" rel="noopener">{{ display(l.shortUrl) }}</a>
                        <button class="btn icon" (click)="copy(l)" [attr.aria-label]="'Copy ' + l.shortUrl" title="Copy"><k-icon name="copy" [size]="15" /></button>
                      </div>
                    </td>
                    <td class="dest">
                      <span class="title">{{ l.title || 'Untitled' }}</span>
                      <span class="url muted" [title]="l.originalUrl">{{ l.originalUrl }}</span>
                      @if (l.tags.length) {
                        <span class="tags">@for (t of l.tags; track t) { <button class="pill" (click)="searchTag(t)">{{ t }}</button> }</span>
                      }
                    </td>
                    <td class="num"><a [routerLink]="['/app/links', l.id]" class="clicks">{{ fmt(l.clickCount) }}</a></td>
                    <td><span class="pill" [class.good]="l.status === 'ACTIVE'" [class.bad]="l.status !== 'ACTIVE'">{{ label[l.status] }}</span></td>
                    <td class="muted nowrap">{{ date(l.createdAt) }}</td>
                    <td class="actions">
                      <a class="btn icon" [routerLink]="['/app/links', l.id]" title="Statistics" aria-label="Statistics"><k-icon name="chart" [size]="16" /></a>
                      <button class="btn icon" (click)="qrFor.set(l)" title="QR code" aria-label="QR code"><k-icon name="qr" [size]="16" /></button>
                      <button class="btn icon" (click)="openEditor(l)" title="Edit" aria-label="Edit"><k-icon name="edit" [size]="16" /></button>
                      <button class="btn icon" (click)="toggle(l)" [title]="l.active ? 'Pause' : 'Resume'" [attr.aria-label]="l.active ? 'Pause' : 'Resume'">
                        <k-icon [name]="l.active ? 'pause' : 'play'" [size]="16" /></button>
                      <button class="btn icon" (click)="remove(l)" title="Delete" aria-label="Delete"><k-icon name="trash" [size]="16" /></button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          @if (p.totalPages > 1) {
            <div class="pager">
              <button class="btn" [disabled]="p.page === 0" (click)="go(p.page - 1)">Previous</button>
              <span class="muted small">Page {{ p.page + 1 }} of {{ p.totalPages }}</span>
              <button class="btn" [disabled]="p.page + 1 >= p.totalPages" (click)="go(p.page + 1)">Next</button>
            </div>
          }
        } @else if (query()) {
          <div class="empty"><h3>No links match “{{ query() }}”</h3><button class="btn" (click)="search$.next('')">Clear search</button></div>
        } @else {
          <div class="empty">
            <h3>Your first short link is one paste away</h3>
            <p>Paste a URL in the bar at the top, or set a custom slug and expiry with New link.</p>
            <button class="btn primary" (click)="openEditor(null)">New link</button>
          </div>
        }
      } @else {
        <div class="empty"><p>Loading links…</p></div>
      }
    </div>

    @if (editing() !== undefined) {
      <k-link-editor [link]="editing() ?? null" (saved)="onSaved($event)" (close)="editing.set(undefined)" />
    }
    @if (qrFor(); as l) { <k-qr-dialog [link]="l" (close)="qrFor.set(null)" /> }
  `,
  styles: `
    .search { flex: 1; display: flex; align-items: center; gap: .5rem; color: var(--muted); max-width: 420px; }
    .search input { flex: 1; border: 0; background: transparent; color: var(--ink); font: inherit; outline: none; padding: .3rem 0; }
    .short { display: flex; align-items: center; gap: .15rem; white-space: nowrap; }
    .short a { color: var(--accent); text-decoration: none; font-weight: 500; }
    .short a:hover { text-decoration: underline; }
    .dest { max-width: 420px; }
    .dest > span { display: block; }
    .title { font-weight: 600; }
    .url { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .82rem; max-width: 400px; }
    .tags { display: flex; gap: .3rem; margin-top: .35rem; flex-wrap: wrap; }
    .tags .pill { cursor: pointer; font-family: inherit; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .clicks { color: var(--ink); font-weight: 700; text-decoration: none; }
    .clicks:hover { color: var(--accent); }
    .nowrap { white-space: nowrap; }
    .actions { white-space: nowrap; text-align: right; }
    .pager { display: flex; justify-content: center; align-items: center; gap: 1rem; padding: 1rem; border-top: 1px solid var(--line); }
    tr.fresh td { background: var(--accent-soft); transition: background 2s; }
    .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  `,
})
export class LinksComponent {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private bus = inject(LinksBus);

  page = signal<Page<Link> | null>(null);
  query = signal('');
  pageNo = signal(0);
  editing = signal<Link | null | undefined>(undefined);
  qrFor = signal<Link | null>(null);
  freshId = signal<number | null>(null);
  search$ = new Subject<string>();
  label = STATUS_LABEL;
  fmt = plain;
  date = shortDate;

  constructor() {
    this.search$.pipe(debounceTime(250), takeUntilDestroyed()).subscribe(q => {
      this.query.set(q);
      this.pageNo.set(0);
      this.load();
    });
    effect(() => {
      const created = this.bus.created();
      if (created) { this.flash(created.id); this.load(); }
    });
    this.load();
  }

  load() {
    this.api.links(this.query(), this.pageNo()).subscribe(p => this.page.set(p));
  }

  go(n: number) { this.pageNo.set(n); this.load(); }

  display(url: string) { return url.replace(/^https?:\/\//, ''); }

  searchTag(t: string) { this.search$.next(t); }

  openEditor(l: Link | null) { this.editing.set(l); }

  onSaved(l: Link) {
    const isNew = !this.editing();
    this.editing.set(undefined);
    this.toast.show(isNew ? `Created ${l.shortUrl}` : 'Changes saved');
    this.flash(l.id);
    this.load();
    this.auth.refresh();
  }

  async copy(l: Link) {
    this.toast.show((await copyText(l.shortUrl)) ? 'Copied to clipboard' : l.shortUrl);
  }

  toggle(l: Link) {
    this.api.updateLink(l.id, { active: !l.active }).subscribe({
      next: u => { this.toast.show(u.active ? 'Link resumed' : 'Link paused. Visitors will see a "paused" page.'); this.load(); },
      error: e => this.toast.error(errorMessage(e)),
    });
  }

  remove(l: Link) {
    if (!confirm(`Delete ${l.shortUrl}? Its click history is deleted too, and the link stops working.`)) return;
    this.api.deleteLink(l.id).subscribe({
      next: () => { this.toast.show('Link deleted'); this.load(); this.auth.refresh(); },
      error: e => this.toast.error(errorMessage(e)),
    });
  }

  private flash(id: number) {
    this.freshId.set(id);
    setTimeout(() => this.freshId.set(null), 2500);
  }
}
