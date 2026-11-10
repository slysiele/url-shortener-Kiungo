package com.kiungo.link;

import com.kiungo.common.ApiException;
import com.kiungo.config.AppProperties;
import com.kiungo.link.LinkDtos.*;
import com.kiungo.user.Plan;
import com.kiungo.user.User;
import com.kiungo.user.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.*;

@Service
public class LinkService {

    private final LinkRepository links;
    private final UserRepository users;
    private final SlugGenerator slugs;
    private final AppProperties props;

    public LinkService(LinkRepository links, UserRepository users, SlugGenerator slugs, AppProperties props) {
        this.links = links;
        this.users = users;
        this.slugs = slugs;
        this.props = props;
    }

    @Transactional
    public LinkResponse create(Long userId, CreateLinkRequest req) {
        User user = users.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
        Plan plan = user.effectivePlan();
        enforceMonthlyQuota(user, plan, 1);
        return toResponse(links.save(build(user, plan, req)));
    }

    @Transactional
    public BulkResponse bulkCreate(Long userId, List<CreateLinkRequest> reqs) {
        User user = users.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
        Plan plan = user.effectivePlan();
        if (!plan.csvImport()) {
            throw ApiException.planLimit("Bulk creation and CSV import need the Starter plan or higher");
        }
        enforceMonthlyQuota(user, plan, reqs.size());
        List<BulkResult> results = new ArrayList<>();
        int created = 0;
        for (int i = 0; i < reqs.size(); i++) {
            try {
                Link saved = links.save(build(user, plan, reqs.get(i)));
                results.add(new BulkResult(i + 1, true, toResponse(saved), null));
                created++;
            } catch (ApiException e) {
                results.add(new BulkResult(i + 1, false, null, e.getMessage()));
            }
        }
        return new BulkResponse(created, reqs.size() - created, results);
    }

    public PageResponse<LinkResponse> list(Long userId, String query, int page, int size) {
        var pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100),
            Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Link> result = (query == null || query.isBlank())
            ? links.findByUserId(userId, pageable)
            : links.search(userId, "%" + query.trim().toLowerCase() + "%", pageable);
        return new PageResponse<>(result.map(this::toResponse).getContent(),
            result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages());
    }

    public List<Link> all(Long userId) {
        return links.findAllByUserIdOrderByCreatedAtDesc(userId);
    }

    public Link get(Long userId, Long id) {
        return links.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Link"));
    }

    public Link getBySlug(Long userId, String slug) {
        return links.findBySlugAndUserId(slug, userId).orElseThrow(() -> ApiException.notFound("Link"));
    }

    @Transactional
    public LinkResponse update(Long userId, Long id, UpdateLinkRequest req) {
        Link link = get(userId, id);
        Plan plan = link.getUser().effectivePlan();
        if (req.url() != null) link.setOriginalUrl(validateUrl(req.url(), "url"));
        if (req.slug() != null && !req.slug().equals(link.getSlug())) {
            link.setSlug(claimCustomSlug(req.slug()));
        }
        if (req.title() != null) link.setTitle(blankToNull(req.title()));
        if (req.tags() != null) link.setTags(joinTags(req.tags()));
        if (req.iosUrl() != null || req.androidUrl() != null) {
            String ios = req.iosUrl() != null ? blankToNull(req.iosUrl()) : link.getIosUrl();
            String android = req.androidUrl() != null ? blankToNull(req.androidUrl()) : link.getAndroidUrl();
            checkTargeting(plan, ios, android);
            link.setIosUrl(ios == null ? null : validateUrl(ios, "iosUrl"));
            link.setAndroidUrl(android == null ? null : validateUrl(android, "androidUrl"));
        }
        if (Boolean.TRUE.equals(req.clearExpiry())) link.setExpiresAt(null);
        else if (req.expiresAt() != null) link.setExpiresAt(req.expiresAt());
        if (Boolean.TRUE.equals(req.clearMaxClicks())) link.setMaxClicks(null);
        else if (req.maxClicks() != null) link.setMaxClicks(req.maxClicks());
        if (req.active() != null) link.setActive(req.active());
        return toResponse(link);
    }

    @Transactional
    public void delete(Long userId, Long id) {
        links.delete(get(userId, id));
    }

    // ---------------------------------------------------------------------------------------------

    private Link build(User user, Plan plan, CreateLinkRequest req) {
        Link link = new Link();
        link.setUser(user);
        link.setOriginalUrl(validateUrl(req.url(), "url"));
        link.setSlug(req.slug() == null || req.slug().isBlank() ? uniqueRandomSlug() : claimCustomSlug(req.slug().trim()));
        link.setTitle(blankToNull(req.title()));
        link.setTags(joinTags(req.tags()));
        String ios = blankToNull(req.iosUrl());
        String android = blankToNull(req.androidUrl());
        checkTargeting(plan, ios, android);
        if (ios != null) link.setIosUrl(validateUrl(ios, "iosUrl"));
        if (android != null) link.setAndroidUrl(validateUrl(android, "androidUrl"));
        if (req.expiresAt() != null && req.expiresAt().isBefore(Instant.now())) {
            throw ApiException.badRequest("INVALID_EXPIRY", "Expiry date must be in the future");
        }
        link.setExpiresAt(req.expiresAt());
        link.setMaxClicks(req.maxClicks());
        return link;
    }

    private void enforceMonthlyQuota(User user, Plan plan, int adding) {
        if (plan.linksPerMonth() < 0) return;
        Instant monthStart = YearMonth.now(ZoneOffset.UTC).atDay(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        long used = links.countByUserIdAndCreatedAtAfter(user.getId(), monthStart);
        if (used + adding > plan.linksPerMonth()) {
            throw ApiException.planLimit("You've used " + used + " of " + plan.linksPerMonth()
                + " links this month on the " + plan.displayName() + " plan. Upgrade to create more.");
        }
    }

    private void checkTargeting(Plan plan, String ios, String android) {
        if ((ios != null || android != null) && !plan.deviceTargeting()) {
            throw ApiException.planLimit("Device targeting (iOS/Android links) needs the Pro plan or higher");
        }
    }

    private String uniqueRandomSlug() {
        for (int attempt = 0; attempt < 10; attempt++) {
            String s = slugs.random(attempt < 5 ? 7 : 9);
            if (!links.existsBySlugIgnoreCase(s)) return s;
        }
        throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "SLUG_EXHAUSTED", "Could not generate a slug, try again");
    }

    private String claimCustomSlug(String slug) {
        if (!slugs.isValidCustom(slug)) {
            throw ApiException.badRequest("INVALID_SLUG",
                "Slug must be 3-64 characters: letters, numbers, - or _ (and not a reserved word)");
        }
        if (links.existsBySlugIgnoreCase(slug)) {
            throw new ApiException(HttpStatus.CONFLICT, "SLUG_TAKEN", "The slug '" + slug + "' is already taken");
        }
        return slug;
    }

    String validateUrl(String raw, String field) {
        String url = raw.trim();
        if (!url.matches("(?i)^[a-z][a-z0-9+.-]*://.*")) url = "https://" + url;
        try {
            URI uri = new URI(url);
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
            if (!scheme.equals("http") && !scheme.equals("https")) {
                throw ApiException.badRequest("INVALID_URL", field + ": only http and https links are allowed");
            }
            if (uri.getHost() == null || !uri.getHost().contains(".")) {
                throw ApiException.badRequest("INVALID_URL", field + ": that doesn't look like a valid web address");
            }
            String ownHost = URI.create(props.baseUrl()).getHost();
            if (uri.getHost().equalsIgnoreCase(ownHost) && !"localhost".equals(ownHost)) {
                throw ApiException.badRequest("INVALID_URL", field + ": can't shorten a link that is already short");
            }
            return url;
        } catch (java.net.URISyntaxException e) {
            throw ApiException.badRequest("INVALID_URL", field + ": that doesn't look like a valid web address");
        }
    }

    private static String joinTags(List<String> tags) {
        if (tags == null) return null;
        LinkedHashSet<String> clean = new LinkedHashSet<>();
        for (String t : tags) {
            if (t != null && !t.isBlank()) clean.add(t.trim().toLowerCase().replace(",", " "));
        }
        return clean.isEmpty() ? null : String.join(",", clean);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    public String shortUrl(Link link) {
        return props.baseUrl() + "/" + link.getSlug();
    }

    public LinkResponse toResponse(Link l) {
        List<String> tags = l.getTags() == null ? List.of() : Arrays.asList(l.getTags().split(","));
        return new LinkResponse(l.getId(), l.getSlug(), shortUrl(l), l.getOriginalUrl(), l.getTitle(), tags,
            l.getIosUrl(), l.getAndroidUrl(), l.getExpiresAt(), l.getMaxClicks(), l.getClickCount(),
            l.isActive(), l.status(), l.getCreatedAt());
    }
}
