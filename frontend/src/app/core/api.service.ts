import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  ApiKey, AuthResponse, BulkResponse, ClickEvent, CreatedKey, Link, LinkInput, Page, PlanId,
  PlansResponse, Profile, Stats,
} from './models';

/** Base path of the backend. Relative so the same build works behind any domain (see docs/DEPLOYMENT.md). */
export const API = '/api/v1';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  // Account
  register(body: { email: string; password: string; name?: string }) { return this.http.post<AuthResponse>(`${API}/auth/register`, body); }
  login(body: { email: string; password: string }) { return this.http.post<AuthResponse>(`${API}/auth/login`, body); }
  me() { return this.http.get<Profile>(`${API}/auth/me`); }
  updateMe(body: { name?: string; theme?: string }) { return this.http.patch<Profile>(`${API}/auth/me`, body); }
  changePassword(body: { currentPassword: string; newPassword: string }) { return this.http.post<void>(`${API}/auth/me/password`, body); }

  // Links
  links(q: string, page: number, size = 20) {
    let params = new HttpParams().set('page', page).set('size', size);
    if (q) params = params.set('q', q);
    return this.http.get<Page<Link>>(`${API}/links`, { params });
  }
  link(id: number) { return this.http.get<Link>(`${API}/links/${id}`); }
  createLink(body: LinkInput) { return this.http.post<Link>(`${API}/links`, body); }
  updateLink(id: number, body: LinkInput) { return this.http.patch<Link>(`${API}/links/${id}`, body); }
  deleteLink(id: number) { return this.http.delete<void>(`${API}/links/${id}`); }
  qr(id: number, size: number, fg: string, bg: string) {
    const params = new HttpParams().set('size', size).set('fg', fg).set('bg', bg);
    return this.http.get(`${API}/links/${id}/qr`, { params, responseType: 'blob' });
  }
  importCsv(file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<BulkResponse>(`${API}/links/import`, form);
  }
  exportCsv() { return this.http.get(`${API}/links/export`, { responseType: 'blob' }); }

  // Analytics
  stats(days: number, linkId?: number, humanOnly = false) {
    let params = new HttpParams().set('days', days).set('humanOnly', humanOnly)
      .set('tz', Intl.DateTimeFormat().resolvedOptions().timeZone);
    if (linkId) params = params.set('linkId', linkId);
    return this.http.get<Stats>(`${API}/stats`, { params });
  }
  clicks(page: number, linkId?: number) {
    let params = new HttpParams().set('page', page).set('size', 50);
    if (linkId) params = params.set('linkId', linkId);
    return this.http.get<Page<ClickEvent>>(`${API}/stats/clicks`, { params });
  }

  // API keys
  apiKeys() { return this.http.get<ApiKey[]>(`${API}/api-keys`); }
  createApiKey(name: string, expiresInDays?: number) { return this.http.post<CreatedKey>(`${API}/api-keys`, { name, expiresInDays }); }
  revokeApiKey(id: number) { return this.http.delete<void>(`${API}/api-keys/${id}`); }

  // Billing
  plans() { return this.http.get<PlansResponse>(`${API}/billing/plans`); }
  checkout(plan: PlanId) { return this.http.post<{ mode: string; redirectUrl: string | null; profile: Profile }>(`${API}/billing/checkout`, { plan }); }
  cancel() { return this.http.post<Profile>(`${API}/billing/cancel`, {}); }
}
