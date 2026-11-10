package com.kiungo.analytics;

import com.kiungo.link.LinkRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Instant;

/** Persists click details off the request thread so redirects stay fast. */
@Service
public class ClickRecorder {

    private static final Logger log = LoggerFactory.getLogger(ClickRecorder.class);

    /** Everything captured from the HTTP request (the request object can't cross threads). */
    public record ClickEvent(Long linkId, Long userId, Instant at, String ipHash, String country, String city,
                             String referrer, String userAgent, String utmSource, String utmMedium,
                             String utmCampaign) {}

    private final ClickRepository clicks;
    private final LinkRepository links;

    public ClickRecorder(ClickRepository clicks, LinkRepository links) {
        this.clicks = clicks;
        this.links = links;
    }

    @Async
    public void record(ClickEvent e) {
        try {
            var ua = UserAgentParser.parse(e.userAgent());
            Click c = new Click();
            c.setLink(links.getReferenceById(e.linkId()));
            c.setUserId(e.userId());
            c.setClickedAt(e.at());
            c.setIpHash(e.ipHash());
            c.setCountry(e.country());
            c.setCity(e.city());
            c.setReferrer(truncate(e.referrer(), 1024));
            c.setReferrerDomain(domainOf(e.referrer()));
            c.setBrowser(ua.browser());
            c.setOs(ua.os());
            c.setDevice(ua.device());
            c.setBot(ua.bot());
            c.setUtmSource(truncate(e.utmSource(), 255));
            c.setUtmMedium(truncate(e.utmMedium(), 255));
            c.setUtmCampaign(truncate(e.utmCampaign(), 255));
            clicks.save(c);
        } catch (Exception ex) {
            log.warn("Failed to record click for link {}: {}", e.linkId(), ex.getMessage());
        }
    }

    static String domainOf(String referrer) {
        if (referrer == null || referrer.isBlank()) return null;
        try {
            String host = java.net.URI.create(referrer.trim()).getHost();
            if (host == null) return null;
            return host.startsWith("www.") ? host.substring(4) : host;
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private static String truncate(String s, int max) {
        return s == null ? null : s.length() <= max ? s : s.substring(0, max);
    }
}
