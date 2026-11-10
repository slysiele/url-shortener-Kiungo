package com.kiungo.analytics;

import com.kiungo.link.Link;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "clicks")
public class Click {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "link_id")
    private Link link;

    /** Denormalised owner id so dashboards don't need to join through links. */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "clicked_at", nullable = false)
    private Instant clickedAt = Instant.now();

    @Column(name = "ip_hash")
    private String ipHash;

    private String country;
    private String city;

    @Column(length = 1024)
    private String referrer;

    @Column(name = "referrer_domain")
    private String referrerDomain;

    private String browser;
    private String os;
    private String device;

    @Column(nullable = false)
    private boolean bot;

    @Column(name = "utm_source")
    private String utmSource;

    @Column(name = "utm_medium")
    private String utmMedium;

    @Column(name = "utm_campaign")
    private String utmCampaign;

    public Long getId() { return id; }
    public Link getLink() { return link; }
    public void setLink(Link link) { this.link = link; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Instant getClickedAt() { return clickedAt; }
    public void setClickedAt(Instant clickedAt) { this.clickedAt = clickedAt; }
    public String getIpHash() { return ipHash; }
    public void setIpHash(String ipHash) { this.ipHash = ipHash; }
    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getReferrer() { return referrer; }
    public void setReferrer(String referrer) { this.referrer = referrer; }
    public String getReferrerDomain() { return referrerDomain; }
    public void setReferrerDomain(String referrerDomain) { this.referrerDomain = referrerDomain; }
    public String getBrowser() { return browser; }
    public void setBrowser(String browser) { this.browser = browser; }
    public String getOs() { return os; }
    public void setOs(String os) { this.os = os; }
    public String getDevice() { return device; }
    public void setDevice(String device) { this.device = device; }
    public boolean isBot() { return bot; }
    public void setBot(boolean bot) { this.bot = bot; }
    public String getUtmSource() { return utmSource; }
    public void setUtmSource(String utmSource) { this.utmSource = utmSource; }
    public String getUtmMedium() { return utmMedium; }
    public void setUtmMedium(String utmMedium) { this.utmMedium = utmMedium; }
    public String getUtmCampaign() { return utmCampaign; }
    public void setUtmCampaign(String utmCampaign) { this.utmCampaign = utmCampaign; }
}
