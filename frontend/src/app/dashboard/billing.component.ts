import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { errorMessage } from '../core/auth.interceptor';
import { AuthService } from '../core/auth.service';
import { PlanId } from '../core/models';
import { ToastService } from '../core/toast.service';
import { shortDate } from '../shared/format';
import { PricingTableComponent } from '../shared/pricing-table.component';

@Component({
  selector: 'k-billing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PricingTableComponent],
  template: `
    <div class="page-head">
      <div><h2>Plan &amp; billing</h2><p>{{ summary() }}</p></div>
      @if (auth.user()?.plan !== 'FREE') { <button class="btn danger" (click)="cancel()">Cancel subscription</button> }
    </div>
    <k-pricing ctaMode="upgrade" [current]="currentPlan()" [busy]="busy()" (choose)="choose($event)" />
    <p class="muted small note">Payments by M-Pesa and card are coming soon. Until then, plan changes apply straight away for testing.</p>
  `,
  styles: `.note { margin-top: 1.25rem; }`,
})
export class BillingComponent {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private toast = inject(ToastService);
  busy = signal<PlanId | null>(null);

  currentPlan = computed(() => {
    const u = this.auth.user();
    return u ? (u.onTrial ? null : u.effectivePlan) : null;
  });

  summary = computed(() => {
    const u = this.auth.user();
    if (!u) return '';
    if (u.onTrial) return `You're on a free Pro trial until ${shortDate(u.trialEndsAt)}. Choose a plan to keep Pro features after that.`;
    if (u.plan === 'FREE') return "You're on the Free plan.";
    return `You're on ${u.plan.charAt(0) + u.plan.slice(1).toLowerCase()}. It renews on ${shortDate(u.planRenewsAt)}.`;
  });

  choose(plan: PlanId) {
    this.busy.set(plan);
    this.api.checkout(plan).subscribe({
      next: r => {
        this.busy.set(null);
        if (r.redirectUrl) { location.href = r.redirectUrl; return; }
        this.auth.setUser(r.profile);
        this.toast.show(`You're now on ${plan.charAt(0) + plan.slice(1).toLowerCase()}`);
      },
      error: e => { this.busy.set(null); this.toast.error(errorMessage(e)); },
    });
  }

  cancel() {
    if (!confirm('Cancel your subscription? You will move to the Free plan.')) return;
    this.api.cancel().subscribe(p => { this.auth.setUser(p); this.toast.show('Subscription cancelled'); });
  }
}
