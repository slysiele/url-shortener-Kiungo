import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Small stroke icon set (24px grid). Add icons by adding path data here. */
const PATHS: Record<string, string> = {
  link: 'M10 14l4-4M8.5 11.5L6.6 13.4a3.5 3.5 0 005 5l1.9-1.9M15.5 12.5l1.9-1.9a3.5 3.5 0 00-5-5L10.5 7.5',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  stream: 'M3 6h18M3 12h12M3 18h6',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  key: 'M15 7a4 4 0 11-3.9 4.9L4 19v2h3v-2h2v-2h2l1.1-1.1A4 4 0 0115 7z',
  card: 'M3 6h18v12H3zM3 10h18',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-2.9 1.2V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-2.9-1.2l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00-1.2-2.9H3a2 2 0 110-4h.1a1.7 1.7 0 001.2-2.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 002.9-1.2V3a2 2 0 114 0v.1a1.7 1.7 0 002.9 1.2l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 001.2 2.9H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-4.3-4.3',
  close: 'M6 6l12 12M18 6L6 18',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  menu: 'M4 6h16M4 12h16M4 18h16',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11',
  download: 'M12 4v12M7 11l5 5 5-5M4 20h16',
  pause: 'M8 5v14M16 5v14',
  play: 'M7 5l12 7-12 7z',
  check: 'M5 12l5 5L20 7',
  refresh: 'M20 11a8 8 0 10-2.3 5.7M20 4v7h-7',
  book: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 5v16',
  bolt: 'M13 3L5 14h6l-1 7 8-11h-6z',
};

@Component({
  selector: 'k-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="d()"/></svg>`,
  styles: `:host { display: inline-flex; flex-shrink: 0; }`,
})
export class IconComponent {
  name = input.required<string>();
  size = input(18);
  d = computed(() => PATHS[this.name()] ?? '');
}

/** Wordmark. The mark is two chain links — kiungo is Swahili for "link". */
@Component({
  selector: 'k-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="mark"><k-icon name="link" [size]="16" /></span><span class="word">kiungo</span>`,
  imports: [IconComponent],
  styles: `
    :host { display: inline-flex; align-items: center; gap: .5rem; text-decoration: none; color: var(--ink); }
    .mark { width: 28px; height: 28px; border-radius: 8px; background: var(--accent); color: var(--accent-ink);
      display: grid; place-items: center; transform: rotate(-8deg); }
    .word { font: 800 1.3rem var(--font-display); letter-spacing: -0.04em; }
  `,
})
export class LogoComponent {}
