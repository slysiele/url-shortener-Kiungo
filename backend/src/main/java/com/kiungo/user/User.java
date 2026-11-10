package com.kiungo.user;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "users")
public class User {

    /** Plan granted to everyone during the free trial. */
    public static final Plan TRIAL_PLAN = Plan.PRO;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    private String name;

    @Column(nullable = false)
    private String role = "USER";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Plan plan = Plan.FREE;

    @Column(name = "trial_ends_at")
    private Instant trialEndsAt;

    @Column(name = "plan_renews_at")
    private Instant planRenewsAt;

    private String theme;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    /** The plan whose limits apply right now (paid plan, else trial, else free). */
    public Plan effectivePlan() {
        if (plan != Plan.FREE) {
            if (planRenewsAt == null || planRenewsAt.isAfter(Instant.now())) return plan;
            return Plan.FREE; // subscription lapsed
        }
        if (isOnTrial()) return TRIAL_PLAN;
        return Plan.FREE;
    }

    public boolean isOnTrial() {
        return plan == Plan.FREE && trialEndsAt != null && trialEndsAt.isAfter(Instant.now());
    }

    public Long getId() { return id; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public Plan getPlan() { return plan; }
    public void setPlan(Plan plan) { this.plan = plan; }
    public Instant getTrialEndsAt() { return trialEndsAt; }
    public void setTrialEndsAt(Instant trialEndsAt) { this.trialEndsAt = trialEndsAt; }
    public Instant getPlanRenewsAt() { return planRenewsAt; }
    public void setPlanRenewsAt(Instant planRenewsAt) { this.planRenewsAt = planRenewsAt; }
    public String getTheme() { return theme; }
    public void setTheme(String theme) { this.theme = theme; }
    public Instant getCreatedAt() { return createdAt; }
}
