package com.kiungo.user;

/**
 * Subscription plans and their limits. -1 means unlimited.
 * Keep this in sync with docs/PLAN.md (pricing section) and the frontend pricing page,
 * which reads plans from GET /api/v1/billing/plans.
 */
public enum Plan {
    //          display      $/mo   links/mo  analyticsDays apiRpm csv    targeting
    FREE      ("Free",          0,       50,          30,     0,  false, false),
    STARTER   ("Starter",     500,    1_000,          90,    60,  true,  false),
    PRO       ("Pro",        1500,   10_000,         365,   300,  true,  true),
    BUSINESS  ("Business",   4900,       -1,          -1,  1000,  true,  true);

    private final String displayName;
    private final int priceUsdCents;
    private final int linksPerMonth;
    private final int analyticsDays;
    private final int apiRequestsPerMinute;
    private final boolean csvImport;
    private final boolean deviceTargeting;

    Plan(String displayName, int priceUsdCents, int linksPerMonth, int analyticsDays,
         int apiRequestsPerMinute, boolean csvImport, boolean deviceTargeting) {
        this.displayName = displayName;
        this.priceUsdCents = priceUsdCents;
        this.linksPerMonth = linksPerMonth;
        this.analyticsDays = analyticsDays;
        this.apiRequestsPerMinute = apiRequestsPerMinute;
        this.csvImport = csvImport;
        this.deviceTargeting = deviceTargeting;
    }

    public String displayName() { return displayName; }
    public int priceUsdCents() { return priceUsdCents; }
    public int linksPerMonth() { return linksPerMonth; }
    public int analyticsDays() { return analyticsDays; }
    public int apiRequestsPerMinute() { return apiRequestsPerMinute; }
    public boolean apiAccess() { return apiRequestsPerMinute > 0; }
    public boolean csvImport() { return csvImport; }
    public boolean deviceTargeting() { return deviceTargeting; }
}
