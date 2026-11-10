import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/landing.component').then(m => m.LandingComponent), title: 'Kiungo: short links that tell you who clicked' },
  { path: 'login', canActivate: [guestGuard], data: { mode: 'login' }, loadComponent: () => import('./pages/auth.component').then(m => m.AuthComponent), title: 'Sign in · Kiungo' },
  { path: 'register', canActivate: [guestGuard], data: { mode: 'register' }, loadComponent: () => import('./pages/auth.component').then(m => m.AuthComponent), title: 'Create account · Kiungo' },
  { path: 'link-unavailable', loadComponent: () => import('./pages/unavailable.component').then(m => m.UnavailableComponent), title: 'Link unavailable · Kiungo' },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./dashboard/shell.component').then(m => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'links' },
      { path: 'links', loadComponent: () => import('./dashboard/links.component').then(m => m.LinksComponent), title: 'Links · Kiungo' },
      { path: 'links/:id', loadComponent: () => import('./dashboard/stats.component').then(m => m.StatsComponent), title: 'Link statistics · Kiungo' },
      { path: 'statistics', loadComponent: () => import('./dashboard/stats.component').then(m => m.StatsComponent), title: 'Statistics · Kiungo' },
      { path: 'clicks', loadComponent: () => import('./dashboard/clicks.component').then(m => m.ClicksComponent), title: 'Click stream · Kiungo' },
      { path: 'import', loadComponent: () => import('./dashboard/import.component').then(m => m.ImportComponent), title: 'Import & export · Kiungo' },
      { path: 'api', loadComponent: () => import('./dashboard/api-keys.component').then(m => m.ApiKeysComponent), title: 'Integrations & API · Kiungo' },
      { path: 'billing', loadComponent: () => import('./dashboard/billing.component').then(m => m.BillingComponent), title: 'Plan & billing · Kiungo' },
      { path: 'settings', loadComponent: () => import('./dashboard/settings.component').then(m => m.SettingsComponent), title: 'Settings · Kiungo' },
    ],
  },
  { path: '**', redirectTo: '' },
];
