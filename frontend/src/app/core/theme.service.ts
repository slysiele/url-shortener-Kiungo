import { Injectable, signal } from '@angular/core';

export interface ThemeOption { id: string; name: string; note: string; swatch: [string, string, string]; }

export const THEMES: ThemeOption[] = [
  { id: 'jacaranda', name: 'Jacaranda', note: 'Light, with the purple of Nairobi in November', swatch: ['#f4f3f8', '#5b3fd9', '#e0a526'] },
  { id: 'night', name: 'Night', note: 'Dark and calm for late campaigns', swatch: ['#15131f', '#9c86ff', '#f2c14e'] },
  { id: 'savanna', name: 'Savanna', note: 'Warm dark, dry-grass gold', swatch: ['#1e1a14', '#e8a33d', '#7fb069'] },
  { id: 'ocean', name: 'Ocean', note: 'Light, coastal teal', swatch: ['#eef5f7', '#0e7c86', '#f28f3b'] },
];

const KEY = 'kiungo.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly current = signal<string>(document.documentElement.dataset['theme'] || 'jacaranda');

  apply(id: string) {
    if (!THEMES.some(t => t.id === id)) return;
    document.documentElement.dataset['theme'] = id;
    this.current.set(id);
    try { localStorage.setItem(KEY, id); } catch { /* storage unavailable */ }
  }
}
