import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LogoComponent } from '../shared/icon.component';

/** Where the backend sends visitors whose short link can't be followed. */
@Component({
  selector: 'k-unavailable',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LogoComponent],
  template: `
    <main>
      <a routerLink="/"><k-logo /></a>
      <h1>{{ copy().title }}</h1>
      <p class="muted">{{ copy().body }}</p>
      @if (slug) { <p class="mono muted">/{{ slug }}</p> }
      <a class="btn primary" routerLink="/">Make your own short links</a>
    </main>
  `,
  styles: `
    main { min-height: 100vh; display: grid; place-content: center; justify-items: center; text-align: center; gap: 1rem; padding: 2rem 1rem; }
    a { text-decoration: none; }
    h1 { font-size: clamp(1.8rem, 4vw, 2.6rem); max-width: 20ch; }
    p { max-width: 48ch; }
  `,
})
export class UnavailableComponent {
  private q = inject(ActivatedRoute).snapshot.queryParamMap;
  slug = this.q.get('slug');
  copy = computed(() => {
    switch (this.q.get('reason')) {
      case 'expired': return { title: 'This link has expired', body: 'The owner set it to stop working after a certain date. Ask them for a new one.' };
      case 'limit_reached': return { title: 'This link reached its click limit', body: 'The owner capped how many times it can be opened. Ask them for a new one.' };
      case 'disabled': return { title: 'This link is paused', body: 'The owner has turned it off for now.' };
      default: return { title: "This short link doesn't exist", body: 'Check for a typo. Short links are case-sensitive.' };
    }
  });
}
