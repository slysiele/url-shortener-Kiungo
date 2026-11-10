import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { Bucket, DayPoint } from '../core/models';
import { plain } from './format';

/**
 * Daily clicks as a smooth area (all clicks) with a line for human clicks.
 * Hand-rolled SVG — no chart library needed for this.
 */
@Component({
  selector: 'k-area-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap" (mouseleave)="hover.set(null)">
      <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" preserveAspectRatio="none" role="img"
           [attr.aria-label]="'Clicks per day over ' + points().length + ' days'">
        @for (g of grid(); track g.y) {
          <line [attr.x1]="0" [attr.x2]="W" [attr.y1]="g.y" [attr.y2]="g.y" class="grid" />
        }
        <path [attr.d]="area()" class="area" />
        <path [attr.d]="line('clicks')" class="line" />
        <path [attr.d]="line('human')" class="line human" />
        @for (p of points(); track p.date; let i = $index) {
          <rect [attr.x]="x(i) - step() / 2" y="0" [attr.width]="step()" [attr.height]="H" fill="transparent"
                (mouseenter)="hover.set(i)" />
        }
        @if (hover() !== null) {
          <line [attr.x1]="x(hover()!)" [attr.x2]="x(hover()!)" y1="0" [attr.y2]="H" class="cursor" />
        }
      </svg>
      <div class="axis">
        @for (g of grid(); track g.y) { <span [style.top.%]="g.y / H * 100">{{ g.label }}</span> }
      </div>
      <div class="xlabels">
        @for (l of xLabels(); track l.i) { <span [style.left.%]="x(l.i) / W * 100">{{ l.text }}</span> }
      </div>
      @if (hover() !== null) {
        <div class="tip" [style.left.%]="x(hover()!) / W * 100" [class.flip]="hover()! > points().length * 0.7">
          <strong>{{ dateLabel(points()[hover()!].date) }}</strong>
          <span><i class="dot all"></i>{{ fmt(points()[hover()!].clicks) }} clicks</span>
          <span><i class="dot human"></i>{{ fmt(points()[hover()!].human) }} human</span>
        </div>
      }
    </div>
    <div class="legend">
      <span><i class="dot all"></i>All clicks</span>
      <span><i class="dot human"></i>Human clicks (bots filtered out)</span>
    </div>
  `,
  styles: `
    .wrap { position: relative; height: 240px; margin: 0 0 1.6rem 2.2rem; }
    svg { width: 100%; height: 100%; display: block; overflow: visible; }
    .grid { stroke: var(--line); stroke-width: 1; vector-effect: non-scaling-stroke; }
    .area { fill: var(--accent); opacity: .14; }
    .line { fill: none; stroke: var(--accent); stroke-width: 2.2; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
    .line.human { stroke: var(--gold); stroke-width: 1.8; stroke-dasharray: 4 3; }
    .cursor { stroke: var(--muted); stroke-width: 1; vector-effect: non-scaling-stroke; }
    .axis span { position: absolute; left: -2.2rem; transform: translateY(-50%); font-size: .72rem; color: var(--muted); width: 1.9rem; text-align: right; }
    .xlabels span { position: absolute; bottom: -1.5rem; transform: translateX(-50%); font-size: .72rem; color: var(--muted); white-space: nowrap; }
    .tip { position: absolute; top: 8px; transform: translateX(10px); background: var(--surface); border: 1px solid var(--line);
      border-radius: var(--r-sm); padding: .5rem .7rem; font-size: .8rem; display: grid; gap: .15rem; box-shadow: var(--shadow); pointer-events: none; white-space: nowrap; }
    .tip.flip { transform: translateX(calc(-100% - 10px)); }
    .legend { display: flex; gap: 1.25rem; flex-wrap: wrap; font-size: .8rem; color: var(--muted); }
    .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: .4rem; }
    .dot.all { background: var(--accent); }
    .dot.human { background: var(--gold); }
  `,
})
export class AreaChartComponent {
  points = input.required<DayPoint[]>();
  readonly W = 1000;
  readonly H = 240;
  hover = signal<number | null>(null);
  fmt = plain;

  max = computed(() => niceMax(Math.max(1, ...this.points().map(p => p.clicks))));
  step = computed(() => this.W / Math.max(1, this.points().length - 1));

  grid = computed(() => [0, 0.25, 0.5, 0.75, 1].map(f => ({
    y: this.H - f * this.H,
    label: compactAxis(Math.round(this.max() * f)),
  })));

  xLabels = computed(() => {
    const n = this.points().length;
    const every = Math.max(1, Math.ceil(n / 7));
    return this.points()
      .map((p, i) => ({ i, text: this.dateLabel(p.date) }))
      .filter(l => l.i % every === 0 || l.i === n - 1)
      .filter((l, idx, arr) => !(l.i === n - 1 && idx > 0 && n - 1 - arr[idx - 1].i < every / 2));
  });

  x(i: number) { return this.points().length <= 1 ? this.W / 2 : i * this.step(); }
  y(v: number) { return this.H - (v / this.max()) * this.H; }

  line(key: 'clicks' | 'human') { return smooth(this.points().map((p, i) => [this.x(i), this.y(p[key])])); }

  area() {
    const pts = this.points();
    if (!pts.length) return '';
    return `${this.line('clicks')} L ${this.x(pts.length - 1)} ${this.H} L 0 ${this.H} Z`;
  }

  dateLabel(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' });
  }
}

/** Ranked horizontal bars, like "Top countries". */
@Component({
  selector: 'k-bar-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="head"><h3>{{ title() }}</h3><span class="muted small">Clicks</span></div>
    @if (items().length) {
      <ol>
        @for (b of items(); track b.label; let first = $first) {
          <li>
            <div class="row"><span class="label" [class.mono]="mono()">{{ b.label }}</span><span class="n">{{ fmt(b.clicks) }}</span></div>
            <div class="track"><div class="fill" [class.lead]="first" [style.width.%]="b.clicks / maxv() * 100"></div></div>
          </li>
        }
      </ol>
    } @else {
      <p class="muted small none">No clicks in this period yet.</p>
    }
  `,
  styles: `
    :host { display: block; background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-lg); padding: 1rem 1.15rem 1.15rem; }
    .head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: .75rem; }
    ol { list-style: none; margin: 0; padding: 0; display: grid; gap: .65rem; }
    .row { display: flex; justify-content: space-between; gap: 1rem; font-size: .88rem; margin-bottom: .25rem; }
    .label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .n { font-variant-numeric: tabular-nums; font-weight: 600; }
    .track { height: 5px; border-radius: 3px; background: var(--surface-2); overflow: hidden; }
    .fill { height: 100%; border-radius: 3px; background: color-mix(in srgb, var(--accent) 55%, var(--surface)); }
    .fill.lead { background: var(--accent); }
    .none { padding: 1rem 0; }
  `,
})
export class BarListComponent {
  title = input.required<string>();
  items = input.required<Bucket[]>();
  mono = input(false);
  fmt = plain;
  maxv = computed(() => Math.max(1, ...this.items().map(b => b.clicks)));
}

function niceMax(v: number): number {
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return Math.max(4, nice * exp);
}

function compactAxis(n: number) {
  return n >= 1000 ? `${Math.round(n / 100) / 10}k` : `${n}`;
}

/** Monotone-ish cubic smoothing that never overshoots below zero. */
function smooth(pts: number[][]): string {
  if (!pts.length) return '';
  if (pts.length === 1) return `M ${pts[0][0]} ${pts[0][1]}`;
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const cx = (x0 + x1) / 2;
    d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
  }
  return d;
}
