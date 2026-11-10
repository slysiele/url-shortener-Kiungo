import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { PlanId } from '../core/models';
import { IconComponent, LogoComponent } from '../shared/icon.component';
import { PricingTableComponent } from '../shared/pricing-table.component';

@Component({
  selector: 'k-landing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, LogoComponent, IconComponent, PricingTableComponent],
  template: `
    <header class="top">
      <a routerLink="/" aria-label="Kiungo home"><k-logo /></a>
      <nav>
        <a href="#pricing">Pricing</a>
        <a href="#api">API</a>
        @if (auth.isLoggedIn()) {
          <a class="btn primary" routerLink="/app/links">Open dashboard</a>
        } @else {
          <a routerLink="/login">Sign in</a>
          <a class="btn primary" routerLink="/register">Start free</a>
        }
      </nav>
    </header>

    <section class="hero">
      <h1>Short links that tell you who clicked.</h1>
      <p class="lede">Paste a link and get a short one for your SMS blast, WhatsApp status or poster.
        Then watch each click come in by country, phone and campaign, with link-preview bots counted separately.</p>

      <div class="fold" aria-hidden="true">
        <span class="scheme">https://</span><span class="long">shop.example.co.ke/campaigns/black-friday-2026?utm_source=sms&amp;utm_campaign=bf</span><span class="short">kiun.go/<b>bf26</b></span>
      </div>

      <form class="shorten" (ngSubmit)="start()">
        <label class="sr" for="hero-url">Link to shorten</label>
        <input id="hero-url" class="input" name="url" [(ngModel)]="url" placeholder="Paste a long link" autocomplete="off" />
        <button class="btn primary lg" type="submit">Shorten it</button>
      </form>
      <p class="muted small">Free for 14 days with every Pro feature. No card needed.</p>
    </section>

    <section class="why">
      <h2>Made for how links travel in East Africa</h2>
      <dl>
        <div>
          <dt>SMS-ready</dt>
          <dd>A 7-character slug leaves room in a 160-character message. Pick your own slug when the word matters.</dd>
        </div>
        <div>
          <dt>Honest numbers</dt>
          <dd>WhatsApp, Facebook and Telegram fetch your link to draw a preview. We label those as bots so your human click count stays real.</dd>
        </div>
        <div>
          <dt>Right store, every phone</dt>
          <dd>Send iPhones to the App Store and Android phones to Play from one link.</dd>
        </div>
        <div>
          <dt>Print it</dt>
          <dd>Every link has a QR code in your brand colours, ready for posters, receipts and packaging.</dd>
        </div>
        <div>
          <dt>Bring your links</dt>
          <dd>Import from a CSV file or another shortener and export everything whenever you like.</dd>
        </div>
        <div>
          <dt>Expiring offers</dt>
          <dd>Set a date or a click limit and the link stops itself when the promo ends.</dd>
        </div>
      </dl>
    </section>

    <section class="api" id="api">
      <div>
        <h2>Shorten from your own app</h2>
        <p>Create an API key in the dashboard and call one endpoint. Your SMS platform, CRM or checkout can create
          tracked links on the fly. The full reference is interactive, so you can try calls in the browser.</p>
        <a class="btn" href="/swagger-ui.html" target="_blank" rel="noopener"><k-icon name="book" [size]="16" />Read the API reference</a>
      </div>
      <pre><code><span class="c"># Create a short link</span>
curl -X POST https://api.kiun.go/api/v1/links \\
  -H "X-API-Key: kk_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{{ '{' }}"url": "https://shop.co.ke/sale", "slug": "sale"{{ '}' }}'

<span class="c"># → 201 Created</span>
{{ '{' }} "shortUrl": "https://kiun.go/sale", "clickCount": 0, … {{ '}' }}</code></pre>
    </section>

    <section class="pricing" id="pricing">
      <h2>Pricing</h2>
      <p class="muted">Start free. Upgrade when your campaigns outgrow it.</p>
      <k-pricing (choose)="pick($event)" />
    </section>

    <footer>
      <k-logo />
      <span class="muted small">© {{ year }} Kiungo. Kiungo means "link" in Swahili.</span>
    </footer>
  `,
  styles: `
    :host { display: block; max-width: 1180px; margin: 0 auto; padding: 0 1.25rem; }
    .top { display: flex; justify-content: space-between; align-items: center; padding: 1.1rem 0; }
    .top a { text-decoration: none; }
    nav { display: flex; align-items: center; gap: 1.4rem; }
    nav > a:not(.btn) { color: var(--ink); font-weight: 500; }

    .hero { padding: 4.5rem 0 3.5rem; max-width: 820px; }
    h1 { font-size: clamp(2.5rem, 6.4vw, 4.6rem); max-width: 13ch; }
    .lede { font-size: 1.15rem; color: var(--muted); max-width: 60ch; margin: 1.25rem 0 2.25rem; }

    /* The signature moment: a long URL folds down into a short one, once, on load. */
    .fold { font: 500 clamp(.85rem, 1.9vw, 1.15rem) var(--font-mono); display: flex; align-items: baseline; white-space: nowrap;
      overflow: hidden; padding: .9rem 1.1rem; background: var(--surface); border: 1px dashed var(--line); border-radius: var(--r-md); margin-bottom: 1rem; }
    .scheme { color: var(--muted); }
    .long { color: var(--muted); display: inline-block; overflow: hidden; max-width: 70ch;
      animation: fold 0.9s cubic-bezier(.7,0,.2,1) 0.9s forwards; }
    .short { color: var(--ink); opacity: 0; transform: translateX(-12px); animation: land .45s ease-out 1.7s forwards; }
    .short b { color: var(--accent); }
    @keyframes fold { to { max-width: 0; opacity: 0; } }
    @keyframes land { to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) {
      .long { max-width: 0; opacity: 0; animation: none; }
      .short { opacity: 1; transform: none; animation: none; }
    }

    .shorten { display: flex; gap: .6rem; margin-bottom: .6rem; }
    .shorten .input { font-size: 1.05rem; padding: .8rem 1rem; }
    .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }

    .why { padding: 3rem 0; border-top: 1px solid var(--line); }
    dl { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem 2.5rem; margin: 2rem 0 0; }
    dt { font: 700 1.1rem var(--font-display); margin-bottom: .4rem; }
    dd { margin: 0; color: var(--muted); max-width: 38ch; }

    .api { display: grid; grid-template-columns: 1fr 1.15fr; gap: 2.5rem; align-items: center; padding: 3.5rem 0; border-top: 1px solid var(--line); }
    .api p { color: var(--muted); margin: .8rem 0 1.4rem; max-width: 52ch; }
    pre { margin: 0; background: var(--ink); color: var(--bg); padding: 1.3rem 1.4rem; border-radius: var(--r-lg); overflow-x: auto;
      font: 500 .82rem/1.7 var(--font-mono); }
    pre .c { opacity: .55; }

    .pricing { padding: 3.5rem 0; border-top: 1px solid var(--line); }
    .pricing > p { margin: .4rem 0 1.75rem; }

    footer { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; padding: 2rem 0 3rem; border-top: 1px solid var(--line); }

    @media (max-width: 860px) {
      dl { grid-template-columns: 1fr 1fr; }
      .api { grid-template-columns: 1fr; }
    }
    @media (max-width: 560px) {
      nav > a[href^='#'] { display: none; }
      .hero { padding-top: 2.5rem; }
      .shorten { flex-direction: column; }
      dl { grid-template-columns: 1fr; }
    }
  `,
})
export class LandingComponent {
  auth = inject(AuthService);
  private router = inject(Router);
  url = '';
  year = new Date().getFullYear();

  start() {
    const target = this.auth.isLoggedIn() ? '/app/links' : '/register';
    this.router.navigate([target], { queryParams: this.url.trim() ? { url: this.url.trim() } : {} });
  }

  pick(_plan: PlanId) {
    this.router.navigate([this.auth.isLoggedIn() ? '/app/billing' : '/register']);
  }
}

