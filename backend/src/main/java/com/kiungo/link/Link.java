package com.kiungo.link;

import com.kiungo.user.User;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "links")
public class Link {

    public enum Status { ACTIVE, DISABLED, EXPIRED, LIMIT_REACHED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(name = "original_url", nullable = false, length = 2048)
    private String originalUrl;

    private String title;

    /** Comma-separated, lower-case tags. */
    @Column(length = 500)
    private String tags;

    /** Device targeting: send iPhone/iPad visitors here instead (e.g. App Store link). */
    @Column(name = "ios_url", length = 2048)
    private String iosUrl;

    /** Device targeting: send Android visitors here instead (e.g. Play Store link). */
    @Column(name = "android_url", length = 2048)
    private String androidUrl;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "max_clicks")
    private Long maxClicks;

    @Column(name = "click_count", nullable = false)
    private long clickCount;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    void touch() {
        updatedAt = Instant.now();
    }

    public Status status() {
        if (!active) return Status.DISABLED;
        if (expiresAt != null && expiresAt.isBefore(Instant.now())) return Status.EXPIRED;
        if (maxClicks != null && clickCount >= maxClicks) return Status.LIMIT_REACHED;
        return Status.ACTIVE;
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public String getOriginalUrl() { return originalUrl; }
    public void setOriginalUrl(String originalUrl) { this.originalUrl = originalUrl; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getTags() { return tags; }
    public void setTags(String tags) { this.tags = tags; }
    public String getIosUrl() { return iosUrl; }
    public void setIosUrl(String iosUrl) { this.iosUrl = iosUrl; }
    public String getAndroidUrl() { return androidUrl; }
    public void setAndroidUrl(String androidUrl) { this.androidUrl = androidUrl; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
    public Long getMaxClicks() { return maxClicks; }
    public void setMaxClicks(Long maxClicks) { this.maxClicks = maxClicks; }
    public long getClickCount() { return clickCount; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
