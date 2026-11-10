import { Injectable, signal } from '@angular/core';

export interface Toast { id: number; text: string; kind: 'info' | 'error' | 'upgrade'; }

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private seq = 0;

  show(text: string, kind: Toast['kind'] = 'info', ms = 3500) {
    const t = { id: ++this.seq, text, kind };
    this.toasts.update(list => [...list, t]);
    setTimeout(() => this.dismiss(t.id), ms);
  }

  error(text: string) { this.show(text, 'error', 5000); }

  dismiss(id: number) { this.toasts.update(list => list.filter(t => t.id !== id)); }
}
