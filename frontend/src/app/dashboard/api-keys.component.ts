import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { errorMessage } from '../core/auth.interceptor';
import { AuthService } from '../core/auth.service';
import { ApiKey } from '../core/models';
import { ToastService } from '../core/toast.service';
import { ago, copyText, shortDate } from '../shared/format';
import { IconComponent } from '../shared/icon.component';

type Lang = 'curl' | 'js' | 'python' | 'java';

@Component({
  selector: 'k-api-keys',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, IconComponent],
  template: `
    <div class="page-head">
      <div><h2>Integrations &amp; API</h2><p>Let your own apps create links and read stats.</p></div>
      <a class="btn" href="/swagger-ui.html" target="_blank" rel="noopener"><k-icon name="book" [size]="16" />API reference</a>
    </div>

    @if (!hasApi()) {
      <div class="panel locked">
        <h3>API access starts on the Starter plan</h3>
        <p class="muted">Upgrade to create keys. Your SMS platform, CRM or website can then shorten links automatically.</p>
        <a class="btn primary" routerLink="/app/billing">See plans</a>
      </div>
    }

    @if (secret(); as s) {
      <div class="panel reveal" role="alert">
        <h3>Copy your new key now</h3>
        <p class="muted small">For your security we only show it once. If you lose it, revoke it and create another.</p>
        <div class="secret"><code>{{ s }}</code><button class="btn" (click)="copy(s)"><k-icon name="copy" [size]="16" />Copy</button></div>
        <button class="btn ghost small" (click)="secret.set(null)">I've saved it</button>
      </div>
    }

    <section class="panel">
      <div class="panel-head">
        <h3>Secret keys</h3>
        <form class="create" (ngSubmit)="create()">
          <input class="input" name="name" [(ngModel)]="name" placeholder="Key name, e.g. SMS campaigns" [disabled]="!hasApi()" />
          <button class="btn primary" type="submit" [disabled]="!hasApi() || busy()"><k-icon name="plus" [size]="16" />Create key</button>
        </form>
      </div>
      @if (keys().length) {
        <table class="data">
          <thead><tr><th>Name</th><th>Key</th><th>Created</th><th>Last used</th><th></th></tr></thead>
          <tbody>
            @for (k of keys(); track k.id) {
              <tr>
                <td><strong>{{ k.name }}</strong></td>
                <td class="mono muted">{{ k.prefix }}…</td>
                <td class="muted">{{ date(k.createdAt) }}</td>
                <td class="muted">{{ k.lastUsedAt ? ago(k.lastUsedAt) : 'Never' }}</td>
                <td class="right"><button class="btn danger" (click)="revoke(k)">Revoke</button></td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <div class="empty"><p>No keys yet. Name one after the app that will use it.</p></div>
      }
    </section>

    <section class="panel code">
      <div class="panel-head">
        <h3>Quick start</h3>
        <div class="tabs" role="tablist">
          @for (l of langs; track l.id) {
            <button role="tab" [attr.aria-selected]="lang() === l.id" [class.on]="lang() === l.id" (click)="lang.set(l.id)">{{ l.name }}</button>
          }
        </div>
      </div>
      <div class="panel-body">
        <div class="snippet"><pre>{{ snippet() }}</pre><button class="btn icon" (click)="copy(snippet())" aria-label="Copy code"><k-icon name="copy" /></button></div>
        <p class="muted small">Send keys in the <span class="mono">X-API-Key</span> header from your server, never from a browser or mobile app.
          Each response carries <span class="mono">X-RateLimit-Remaining</span> so you can pace bulk jobs.</p>
      </div>
    </section>
  `,
  styles: `
    .locked { padding: 1.5rem; margin-bottom: 1rem; display: grid; gap: .6rem; justify-items: start; border-color: var(--accent); }
    .reveal { padding: 1.25rem; margin-bottom: 1rem; display: grid; gap: .6rem; border-color: var(--gold); justify-items: start; }
    .secret { display: flex; gap: .5rem; align-items: center; width: 100%; }
    .secret code { flex: 1; font: .9rem var(--font-mono); background: var(--surface-2); padding: .6rem .8rem; border-radius: var(--r-sm); overflow-x: auto; white-space: nowrap; border: 1px solid var(--line); }
    .create { display: flex; gap: .5rem; flex: 1; max-width: 460px; }
    .right { text-align: right; }
    .code { margin-top: 1rem; }
    .tabs { display: flex; gap: 2px; background: var(--surface-2); padding: 3px; border-radius: var(--r-sm); border: 1px solid var(--line); }
    .tabs button { border: 0; background: transparent; color: var(--muted); font: 600 .82rem var(--font-body); padding: .35rem .7rem; border-radius: 4px; cursor: pointer; }
    .tabs button.on { background: var(--surface); color: var(--ink); box-shadow: 0 1px 2px rgba(0,0,0,.08); }
    .snippet { position: relative; }
    .snippet pre { margin: 0 0 .75rem; background: var(--ink); color: var(--bg); padding: 1.1rem 1.2rem; border-radius: var(--r-md); font: .8rem/1.65 var(--font-mono); overflow-x: auto; }
    .snippet .btn { position: absolute; top: .5rem; right: .5rem; color: var(--bg); opacity: .7; }
    @media (max-width: 700px) { .panel-head { flex-wrap: wrap; } .create { max-width: none; } }
  `,
})
export class ApiKeysComponent {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  keys = signal<ApiKey[]>([]);
  secret = signal<string | null>(null);
  busy = signal(false);
  name = '';
  lang = signal<Lang>('curl');
  langs: { id: Lang; name: string }[] = [
    { id: 'curl', name: 'cURL' }, { id: 'js', name: 'Node.js' }, { id: 'python', name: 'Python' }, { id: 'java', name: 'Java' },
  ];
  date = shortDate;
  ago = ago;

  hasApi = computed(() => ['STARTER', 'PRO', 'BUSINESS'].includes(this.auth.user()?.effectivePlan ?? ''));
  base = location.origin.includes('localhost') ? 'http://localhost:8080' : location.origin;

  snippet = computed(() => {
    const key = this.secret() ?? 'kk_live_YOUR_KEY';
    const url = `${this.base}/api/v1/links`;
    switch (this.lang()) {
      case 'js': return `const res = await fetch("${url}", {
  method: "POST",
  headers: { "X-API-Key": "${key}", "Content-Type": "application/json" },
  body: JSON.stringify({ url: "https://shop.co.ke/sale", tags: ["sms"] }),
});
const link = await res.json();
console.log(link.shortUrl);`;
      case 'python': return `import requests

r = requests.post(
    "${url}",
    headers={"X-API-Key": "${key}"},
    json={"url": "https://shop.co.ke/sale", "tags": ["sms"]},
)
print(r.json()["shortUrl"])`;
      case 'java': return `var client = HttpClient.newHttpClient();
var req = HttpRequest.newBuilder(URI.create("${url}"))
    .header("X-API-Key", "${key}")
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString(
        "{\\"url\\":\\"https://shop.co.ke/sale\\",\\"tags\\":[\\"sms\\"]}"))
    .build();
System.out.println(client.send(req, HttpResponse.BodyHandlers.ofString()).body());`;
      default: return `curl -X POST ${url} \\
  -H "X-API-Key: ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://shop.co.ke/sale", "tags": ["sms"]}'

# Read stats for the last 7 days
curl "${this.base}/api/v1/stats?days=7" -H "X-API-Key: ${key}"`;
    }
  });

  constructor() { this.load(); }

  load() { this.api.apiKeys().subscribe(k => this.keys.set(k)); }

  create() {
    this.busy.set(true);
    this.api.createApiKey(this.name || 'API key').subscribe({
      next: r => { this.busy.set(false); this.secret.set(r.secret); this.name = ''; this.load(); },
      error: e => { this.busy.set(false); if (e.status !== 402) this.toast.error(errorMessage(e)); },
    });
  }

  revoke(k: ApiKey) {
    if (!confirm(`Revoke "${k.name}"? Apps using it will stop working straight away.`)) return;
    this.api.revokeApiKey(k.id).subscribe(() => { this.toast.show('Key revoked'); this.load(); });
  }

  async copy(text: string) { this.toast.show((await copyText(text)) ? 'Copied to clipboard' : 'Copy failed. Select the text instead.'); }
}
