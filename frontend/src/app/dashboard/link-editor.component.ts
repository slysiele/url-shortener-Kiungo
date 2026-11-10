import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { errorMessage } from '../core/auth.interceptor';
import { AuthService } from '../core/auth.service';
import { Link, LinkInput } from '../core/models';
import { IconComponent } from '../shared/icon.component';

/** Create / edit a link, including UTM builder, expiry, click cap and device targeting. */
@Component({
  selector: 'k-link-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IconComponent],
  template: `
    <div class="backdrop" (click)="close.emit()">
      <form class="modal" (click)="$event.stopPropagation()" (ngSubmit)="save()" role="dialog" aria-modal="true" aria-labelledby="editor-title">
        <div class="modal-head">
          <h2 id="editor-title">{{ link() ? 'Edit link' : 'New link' }}</h2>
          <button type="button" class="btn icon" (click)="close.emit()" aria-label="Close"><k-icon name="close" /></button>
        </div>
        <div class="modal-body">
          <label class="field"><span>Destination</span>
            <input class="input" name="url" [(ngModel)]="url" required placeholder="https://example.com/a/very/long/page" autofocus />
          </label>

          <div class="two">
            <label class="field"><span>Custom slug</span>
              <div class="slug"><span class="muted mono">{{ host }}/</span>
                <input class="input mono" name="slug" [(ngModel)]="slug" placeholder="random" pattern="[A-Za-z0-9_-]{3,64}" />
              </div>
              <small>Leave empty for a random one.</small>
            </label>
            <label class="field"><span>Title</span>
              <input class="input" name="title" [(ngModel)]="title" placeholder="Black Friday SMS" />
            </label>
          </div>

          <label class="field"><span>Tags</span>
            <input class="input" name="tags" [(ngModel)]="tags" placeholder="sales, sms" />
            <small>Separate with commas. Tags help you search and group links.</small>
          </label>

          <details [open]="utmOpen()">
            <summary>Campaign tracking (UTM)</summary>
            <div class="three">
              <label class="field"><span>Source</span><input class="input" name="utmSource" [(ngModel)]="utmSource" placeholder="sms" /></label>
              <label class="field"><span>Medium</span><input class="input" name="utmMedium" [(ngModel)]="utmMedium" placeholder="bulk" /></label>
              <label class="field"><span>Campaign</span><input class="input" name="utmCampaign" [(ngModel)]="utmCampaign" placeholder="black-friday" /></label>
            </div>
            <small class="muted">These are added to the destination so Google Analytics sees them too.</small>
          </details>

          <details [open]="limitsOpen()">
            <summary>Expiry and click limit</summary>
            <div class="two">
              <label class="field"><span>Stops working on</span>
                <input class="input" type="datetime-local" name="expiresAt" [(ngModel)]="expiresAt" />
              </label>
              <label class="field"><span>Max clicks</span>
                <input class="input" type="number" min="1" name="maxClicks" [(ngModel)]="maxClicks" placeholder="No limit" />
              </label>
            </div>
          </details>

          <details [open]="targetingOpen()">
            <summary>Send phones to their app store @if (!canTarget()) { <span class="pill">Pro</span> }</summary>
            <div class="two">
              <label class="field"><span>iPhone and iPad go to</span>
                <input class="input" name="iosUrl" [(ngModel)]="iosUrl" [disabled]="!canTarget()" placeholder="https://apps.apple.com/…" />
              </label>
              <label class="field"><span>Android goes to</span>
                <input class="input" name="androidUrl" [(ngModel)]="androidUrl" [disabled]="!canTarget()" placeholder="https://play.google.com/…" />
              </label>
            </div>
          </details>

          @if (error()) { <p class="err" role="alert">{{ error() }}</p> }
        </div>
        <div class="modal-foot">
          <button type="button" class="btn" (click)="close.emit()">Cancel</button>
          <button type="submit" class="btn primary" [disabled]="busy() || !url.trim()">{{ link() ? 'Save changes' : 'Create link' }}</button>
        </div>
      </form>
    </div>
  `,
  styles: `
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: .9rem; align-items: start; }
    .three { display: grid; grid-template-columns: repeat(3, 1fr); gap: .75rem; margin: .75rem 0 .4rem; }
    .two + small { margin-top: -.5rem; }
    details .two { margin-top: .75rem; }
    summary { cursor: pointer; font-weight: 600; font-size: .9rem; display: flex; align-items: center; gap: .5rem; }
    details { border-top: 1px solid var(--line); padding-top: .9rem; }
    .slug { display: flex; align-items: center; gap: .3rem; }
    .slug span { font-size: .85rem; white-space: nowrap; }
    .slug input { flex: 1; min-width: 0; }
    .err { color: var(--bad); font-size: .9rem; }
    @media (max-width: 560px) { .two, .three { grid-template-columns: 1fr; } }
  `,
})
export class LinkEditorComponent implements OnInit {
  link = input<Link | null>(null);
  saved = output<Link>();
  close = output<void>();

  private api = inject(ApiService);
  private auth = inject(AuthService);

  host = location.host.includes('localhost') ? 'localhost:8080' : 'kiun.go';
  url = ''; slug = ''; title = ''; tags = '';
  utmSource = ''; utmMedium = ''; utmCampaign = '';
  expiresAt = ''; maxClicks: number | null = null;
  iosUrl = ''; androidUrl = '';

  busy = signal(false);
  error = signal<string | null>(null);
  utmOpen = signal(false);
  limitsOpen = signal(false);
  targetingOpen = signal(false);
  canTarget = computed(() => ['PRO', 'BUSINESS'].includes(this.auth.user()?.effectivePlan ?? ''));

  ngOnInit() {
    const l = this.link();
    if (!l) return;
    this.host = new URL(l.shortUrl).host;
    this.slug = l.slug;
    this.title = l.title ?? '';
    this.tags = l.tags.join(', ');
    this.iosUrl = l.iosUrl ?? '';
    this.androidUrl = l.androidUrl ?? '';
    this.maxClicks = l.maxClicks;
    if (l.expiresAt) this.expiresAt = toLocalInput(l.expiresAt);
    // pull UTM params back out of the destination for editing
    try {
      const u = new URL(l.originalUrl);
      this.utmSource = u.searchParams.get('utm_source') ?? '';
      this.utmMedium = u.searchParams.get('utm_medium') ?? '';
      this.utmCampaign = u.searchParams.get('utm_campaign') ?? '';
      ['utm_source', 'utm_medium', 'utm_campaign'].forEach(k => u.searchParams.delete(k));
      this.url = u.toString();
    } catch {
      this.url = l.originalUrl;
    }
    this.utmOpen.set(!!(this.utmSource || this.utmMedium || this.utmCampaign));
    this.limitsOpen.set(!!(l.expiresAt || l.maxClicks));
    this.targetingOpen.set(!!(l.iosUrl || l.androidUrl));
  }

  save() {
    this.error.set(null);
    this.busy.set(true);
    const l = this.link();
    const body: LinkInput = {
      url: withUtm(this.url.trim(), this.utmSource, this.utmMedium, this.utmCampaign),
      slug: this.slug.trim() || undefined,
      title: this.title,
      tags: this.tags.split(',').map(t => t.trim()).filter(Boolean),
      iosUrl: this.canTarget() ? this.iosUrl : undefined,
      androidUrl: this.canTarget() ? this.androidUrl : undefined,
    };
    if (this.expiresAt) body.expiresAt = new Date(this.expiresAt).toISOString();
    else if (l?.expiresAt) body.clearExpiry = true;
    if (this.maxClicks) body.maxClicks = this.maxClicks;
    else if (l?.maxClicks) body.clearMaxClicks = true;
    if (!l) { if (!body.iosUrl) delete body.iosUrl; if (!body.androidUrl) delete body.androidUrl; }

    const req = l ? this.api.updateLink(l.id, body) : this.api.createLink(body);
    req.subscribe({
      next: saved => { this.busy.set(false); this.saved.emit(saved); },
      error: err => { this.busy.set(false); this.error.set(errorMessage(err, 'Could not save the link')); },
    });
  }
}

function withUtm(url: string, source: string, medium: string, campaign: string): string {
  if (!source && !medium && !campaign) return url;
  try {
    const u = new URL(/^[a-z]+:\/\//i.test(url) ? url : `https://${url}`);
    if (source) u.searchParams.set('utm_source', source.trim());
    if (medium) u.searchParams.set('utm_medium', medium.trim());
    if (campaign) u.searchParams.set('utm_campaign', campaign.trim());
    return u.toString();
  } catch {
    return url;
  }
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
