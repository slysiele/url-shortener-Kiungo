// Mirrors the backend DTOs (see backend/src/main/java/com/kiungo/**/…Dtos.java)

export type PlanId = 'FREE' | 'STARTER' | 'PRO' | 'BUSINESS';

export interface Usage {
  linksThisMonth: number;
  linksPerMonthLimit: number; // -1 = unlimited
  totalLinks: number;
  totalClicks: number;
}

export interface Profile {
  id: number;
  email: string;
  name: string | null;
  theme: string | null;
  plan: PlanId;
  effectivePlan: PlanId;
  onTrial: boolean;
  trialEndsAt: string | null;
  planRenewsAt: string | null;
  usage: Usage;
  createdAt: string;
}

export interface AuthResponse { token: string; user: Profile; }

export type LinkStatus = 'ACTIVE' | 'DISABLED' | 'EXPIRED' | 'LIMIT_REACHED';

export interface Link {
  id: number;
  slug: string;
  shortUrl: string;
  originalUrl: string;
  title: string | null;
  tags: string[];
  iosUrl: string | null;
  androidUrl: string | null;
  expiresAt: string | null;
  maxClicks: number | null;
  clickCount: number;
  active: boolean;
  status: LinkStatus;
  createdAt: string;
}

export interface LinkInput {
  url?: string;
  slug?: string;
  title?: string;
  tags?: string[];
  iosUrl?: string;
  androidUrl?: string;
  expiresAt?: string | null;
  clearExpiry?: boolean;
  maxClicks?: number | null;
  clearMaxClicks?: boolean;
  active?: boolean;
}

export interface Page<T> { items: T[]; page: number; size: number; total: number; totalPages: number; }

export interface BulkResult { row: number; ok: boolean; link: Link | null; error: string | null; }
export interface BulkResponse { created: number; failed: number; results: BulkResult[]; }

export interface Metric { current: number; previous: number; }
export interface Bucket { label: string; clicks: number; }
export interface DayPoint { date: string; clicks: number; human: number; }

export interface Stats {
  days: number;
  clampedByPlan: boolean;
  from: string;
  to: string;
  overview: {
    totalClicks: Metric;
    humanClicks: Metric;
    uniqueVisitors: Metric;
    linksCreated: Metric;
    avgClicksPerLink: number;
  };
  series: DayPoint[];
  topLinks: Bucket[];
  countries: Bucket[];
  cities: Bucket[];
  browsers: Bucket[];
  os: Bucket[];
  devices: Bucket[];
  referrers: Bucket[];
  utmSources: Bucket[];
  utmMediums: Bucket[];
  utmCampaigns: Bucket[];
}

export interface ClickEvent {
  id: number;
  clickedAt: string;
  slug: string;
  shortUrl: string;
  bot: boolean;
  country: string | null;
  city: string | null;
  referrer: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  utmSource: string | null;
}

export interface ApiKey { id: number; name: string; prefix: string; createdAt: string; lastUsedAt: string | null; expiresAt: string | null; }
export interface CreatedKey { key: ApiKey; secret: string; }

export interface PlanView {
  id: PlanId;
  name: string;
  priceUsdCents: number;
  linksPerMonth: number;
  analyticsDays: number;
  apiRequestsPerMinute: number;
  apiAccess: boolean;
  csvImport: boolean;
  deviceTargeting: boolean;
}
export interface PlansResponse { trialDays: number; trialPlan: PlanId; plans: PlanView[]; }

export interface ApiError { status: number; code: string; message: string; fields?: Record<string, string>; }
