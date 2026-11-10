import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToastService } from '../core/toast.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'k-toasts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="stack" aria-live="polite">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [class.error]="t.kind === 'error'" [class.upgrade]="t.kind === 'upgrade'">
          <span>{{ t.text }}</span>
          @if (t.kind === 'upgrade') {
            <a class="btn primary" routerLink="/app/billing" (click)="toast.dismiss(t.id)">See plans</a>
          }
          <button class="btn icon" (click)="toast.dismiss(t.id)" aria-label="Dismiss"><k-icon name="close" [size]="16" /></button>
        </div>
      }
    </div>
  `,
  styles: `
    .stack { position: fixed; bottom: 1rem; right: 1rem; left: 1rem; display: grid; justify-items: end; gap: .5rem; z-index: 100; pointer-events: none; }
    .toast { pointer-events: auto; display: flex; align-items: center; gap: .75rem; max-width: 460px; background: var(--ink); color: var(--bg);
      padding: .65rem .65rem .65rem 1rem; border-radius: var(--r-md); box-shadow: var(--shadow); font-size: .9rem; animation: rise .2s ease-out; }
    .toast.error { background: var(--bad); color: #fff; }
    .toast .btn.icon { color: inherit; opacity: .7; }
    .toast .btn.icon:hover { background: transparent; opacity: 1; }
  `,
})
export class ToastHostComponent {
  toast = inject(ToastService);
}
