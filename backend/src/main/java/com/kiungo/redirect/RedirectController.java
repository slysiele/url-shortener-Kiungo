package com.kiungo.redirect;

import com.kiungo.analytics.ClickRecorder;
import com.kiungo.analytics.ClickRecorder.ClickEvent;
import com.kiungo.config.AppProperties;
import com.kiungo.link.Link;
import com.kiungo.link.LinkRepository;
import io.swagger.v3.oas.annotations.Hidden;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;

/**
 * The hot path: GET /{slug} → 302 to the destination.
 * Click details are recorded asynchronously so the visitor isn't kept waiting.
 */
@RestController
@Hidden
public class RedirectController {

    private final LinkRepository links;
    private final ClickRecorder recorder;
    private final AppProperties props;

    public RedirectController(LinkRepository links, ClickRecorder recorder, AppProperties props) {
        this.links = links;
        this.recorder = recorder;
        this.props = props;
    }

    @GetMapping("/")
    public ResponseEntity<Void> root() {
        return redirect(props.frontendUrl());
    }

    @GetMapping("/{slug:[A-Za-z0-9_-]{3,64}}")
    public ResponseEntity<Void> follow(@PathVariable String slug, HttpServletRequest req) {
        Link link = links.findBySlug(slug).orElse(null);
        if (link == null) {
            return redirect(props.frontendUrl() + "/link-unavailable?reason=not-found&slug=" + enc(slug));
        }
        Link.Status status = link.status();
        if (status != Link.Status.ACTIVE) {
            return redirect(props.frontendUrl() + "/link-unavailable?reason=" + status.name().toLowerCase()
                + "&slug=" + enc(slug));
        }

        String ua = req.getHeader("User-Agent");
        String destination = pickDestination(link, ua);
        destination = forwardQuery(destination, req.getQueryString());

        links.incrementClicks(link.getId());
        recorder.record(new ClickEvent(
            link.getId(), link.getUser().getId(), Instant.now(),
            hashIp(clientIp(req)), country(req), header(req, "CF-IPCity", "X-Vercel-IP-City"),
            req.getHeader("Referer"), ua,
            param(req, "utm_source", link.getOriginalUrl()),
            param(req, "utm_medium", link.getOriginalUrl()),
            param(req, "utm_campaign", link.getOriginalUrl())));

        return redirect(destination);
    }

    // ---------------------------------------------------------------------------------------------

    private static ResponseEntity<Void> redirect(String url) {
        return ResponseEntity.status(HttpStatus.FOUND)
            .location(URI.create(url))
            .cacheControl(CacheControl.noStore()) // every visit must reach us to be counted
            .build();
    }

    private static String pickDestination(Link link, String ua) {
        if (ua != null) {
            String s = ua.toLowerCase(Locale.ROOT);
            if (link.getIosUrl() != null && (s.contains("iphone") || s.contains("ipad") || s.contains("ipod"))) {
                return link.getIosUrl();
            }
            if (link.getAndroidUrl() != null && s.contains("android")) return link.getAndroidUrl();
        }
        return link.getOriginalUrl();
    }

    /** kiun.go/abc?utm_source=x → https://dest.com/page?utm_source=x (existing params kept). */
    static String forwardQuery(String destination, String query) {
        if (query == null || query.isBlank()) return destination;
        int hash = destination.indexOf('#');
        String fragment = hash >= 0 ? destination.substring(hash) : "";
        String base = hash >= 0 ? destination.substring(0, hash) : destination;
        return base + (base.contains("?") ? "&" : "?") + query + fragment;
    }

    private static String country(HttpServletRequest req) {
        String code = header(req, "CF-IPCountry", "X-Vercel-IP-Country", "CloudFront-Viewer-Country", "X-Country-Code");
        if (code == null || code.length() != 2 || code.equalsIgnoreCase("XX") || code.equalsIgnoreCase("T1")) return null;
        String name = Locale.of("", code.toUpperCase(Locale.ROOT)).getDisplayCountry(Locale.ENGLISH);
        return name.isBlank() ? code.toUpperCase(Locale.ROOT) : name;
    }

    private static String clientIp(HttpServletRequest req) {
        String cf = req.getHeader("CF-Connecting-IP");
        if (cf != null && !cf.isBlank()) return cf.trim();
        return req.getRemoteAddr(); // X-Forwarded-For is already applied by server.forward-headers-strategy
    }

    private String hashIp(String ip) {
        if (ip == null) return null;
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] d = md.digest((props.ipHashSalt() + ":" + ip).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(d).substring(0, 32);
        } catch (NoSuchAlgorithmException e) {
            return null;
        }
    }

    private static String header(HttpServletRequest req, String... names) {
        for (String n : names) {
            String v = req.getHeader(n);
            if (v != null && !v.isBlank()) return v.trim();
        }
        return null;
    }

    /** UTM value from the short-link query string first, else from the destination URL itself. */
    private static String param(HttpServletRequest req, String name, String originalUrl) {
        String v = req.getParameter(name);
        if (v != null && !v.isBlank()) return v;
        try {
            String q = URI.create(originalUrl).getRawQuery();
            if (q == null) return null;
            for (String pair : q.split("&")) {
                int eq = pair.indexOf('=');
                if (eq > 0 && pair.substring(0, eq).equals(name)) {
                    return java.net.URLDecoder.decode(pair.substring(eq + 1), StandardCharsets.UTF_8);
                }
            }
        } catch (IllegalArgumentException ignored) { }
        return null;
    }

    private static String enc(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8);
    }
}
