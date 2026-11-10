package com.kiungo.analytics;

import com.kiungo.analytics.StatsDtos.*;
import com.kiungo.common.ApiException;
import com.kiungo.config.AppProperties;
import com.kiungo.link.LinkDtos.PageResponse;
import com.kiungo.user.Plan;
import com.kiungo.user.User;
import com.kiungo.user.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;

/**
 * Aggregates click data for dashboards. Queries run directly against the clicks table, which is
 * fine into the low millions of clicks. Beyond that, see docs/ARCHITECTURE.md → "Scaling analytics"
 * (daily rollup tables or ClickHouse).
 */
@Service
@Transactional(readOnly = true)
public class StatsService {

    /** Whitelisted columns that can be grouped on (never interpolate user input into JPQL). */
    private static final Set<String> GROUPABLE = Set.of(
        "country", "city", "browser", "os", "device", "referrerDomain", "utmSource", "utmMedium", "utmCampaign");

    private final EntityManager em;
    private final UserRepository users;
    private final ClickRepository clicks;
    private final AppProperties props;

    public StatsService(EntityManager em, UserRepository users, ClickRepository clicks, AppProperties props) {
        this.em = em;
        this.users = users;
        this.clicks = clicks;
        this.props = props;
    }

    public StatsResponse stats(Long userId, int requestedDays, Long linkId, String tz, boolean humanOnly) {
        User user = users.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
        Plan plan = user.effectivePlan();
        int days = Math.min(Math.max(requestedDays, 1), 3650);
        boolean clamped = false;
        if (plan.analyticsDays() > 0 && days > plan.analyticsDays()) {
            days = plan.analyticsDays();
            clamped = true;
        }
        ZoneId zone = zone(tz);
        LocalDate today = LocalDate.now(zone);
        Instant from = today.minusDays(days - 1L).atStartOfDay(zone).toInstant();
        Instant to = Instant.now();
        Instant prevFrom = from.minus(Duration.ofDays(days));

        Filter f = new Filter(userId, linkId, from, to, humanOnly);
        Filter prev = new Filter(userId, linkId, prevFrom, from, humanOnly);

        long total = count(f.withHumanOnly(false), false);
        long human = count(f.withHumanOnly(true), false);
        long linksNow = linksCreated(userId, from, to);
        long linkCount = linkId != null ? 1 : countLinks(userId);
        Overview overview = new Overview(
            new Metric(total, count(prev.withHumanOnly(false), false)),
            new Metric(human, count(prev.withHumanOnly(true), false)),
            new Metric(count(f, true), count(prev, true)),
            new Metric(linksNow, linksCreated(userId, prevFrom, from)),
            linkCount == 0 ? 0 : Math.round(total * 100.0 / linkCount) / 100.0);

        return new StatsResponse(days, clamped, from, to, overview,
            series(f, zone, today, days),
            topLinks(f),
            top(f, "country"), top(f, "city"), top(f, "browser"), top(f, "os"), top(f, "device"),
            top(f, "referrerDomain"), top(f, "utmSource"), top(f, "utmMedium"), top(f, "utmCampaign"));
    }

    public PageResponse<ClickEventView> stream(Long userId, Long linkId, int page, int size) {
        var pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100),
            Sort.by(Sort.Direction.DESC, "clickedAt"));
        Page<Click> result = linkId == null
            ? clicks.findByUserId(userId, pageable)
            : clicks.findByUserIdAndLinkId(userId, linkId, pageable);
        var items = result.getContent().stream().map(c -> new ClickEventView(
            c.getId(), c.getClickedAt(), c.getLink().getSlug(), props.baseUrl() + "/" + c.getLink().getSlug(),
            c.isBot(), c.getCountry(), c.getCity(), c.getReferrerDomain(), c.getBrowser(), c.getOs(),
            c.getDevice(), c.getUtmSource())).toList();
        return new PageResponse<>(items, result.getNumber(), result.getSize(), result.getTotalElements(),
            result.getTotalPages());
    }

    // ---------------------------------------------------------------------------------------------

    private record Filter(Long userId, Long linkId, Instant from, Instant to, boolean humanOnly) {
        Filter withHumanOnly(boolean h) { return new Filter(userId, linkId, from, to, h); }

        String where() {
            return " where c.userId = :uid and c.clickedAt >= :from and c.clickedAt < :to"
                + (linkId != null ? " and c.link.id = :lid" : "")
                + (humanOnly ? " and c.bot = false" : "");
        }

        <T> TypedQuery<T> bind(TypedQuery<T> q) {
            q.setParameter("uid", userId).setParameter("from", from).setParameter("to", to);
            if (linkId != null) q.setParameter("lid", linkId);
            return q;
        }
    }

    private long count(Filter f, boolean distinctVisitors) {
        String select = distinctVisitors ? "select count(distinct c.ipHash)" : "select count(c)";
        return f.bind(em.createQuery(select + " from Click c" + f.where(), Long.class)).getSingleResult();
    }

    private long linksCreated(Long userId, Instant from, Instant to) {
        return em.createQuery("select count(l) from Link l where l.user.id = :uid and l.createdAt >= :from and l.createdAt < :to", Long.class)
            .setParameter("uid", userId).setParameter("from", from).setParameter("to", to).getSingleResult();
    }

    private long countLinks(Long userId) {
        return em.createQuery("select count(l) from Link l where l.user.id = :uid", Long.class)
            .setParameter("uid", userId).getSingleResult();
    }

    private List<Bucket> top(Filter f, String field) {
        if (!GROUPABLE.contains(field)) throw new IllegalArgumentException(field);
        String jpql = "select c." + field + ", count(c) from Click c" + f.where()
            + " group by c." + field + " order by count(c) desc";
        return toBuckets(f.bind(em.createQuery(jpql, Object[].class)).setMaxResults(10).getResultList());
    }

    private List<Bucket> topLinks(Filter f) {
        String jpql = "select c.link.slug, count(c) from Click c" + f.where()
            + " group by c.link.slug order by count(c) desc";
        return toBuckets(f.bind(em.createQuery(jpql, Object[].class)).setMaxResults(10).getResultList());
    }

    private static List<Bucket> toBuckets(List<Object[]> rows) {
        return rows.stream()
            .map(r -> new Bucket(r[0] == null ? "Unknown" : r[0].toString(), ((Number) r[1]).longValue()))
            .toList();
    }

    /** Per-day series in the viewer's time zone, with zero-filled gaps. */
    private List<DayPoint> series(Filter f, ZoneId zone, LocalDate today, int days) {
        String jpql = "select c.clickedAt, c.bot from Click c" + f.withHumanOnly(false).where();
        List<Object[]> rows = f.withHumanOnly(false).bind(em.createQuery(jpql, Object[].class)).getResultList();
        Map<LocalDate, long[]> byDay = new TreeMap<>();
        for (int i = days - 1; i >= 0; i--) byDay.put(today.minusDays(i), new long[2]);
        for (Object[] r : rows) {
            LocalDate d = ((Instant) r[0]).atZone(zone).toLocalDate();
            long[] slot = byDay.get(d);
            if (slot == null) continue;
            slot[0]++;
            if (!(Boolean) r[1]) slot[1]++;
        }
        List<DayPoint> out = new ArrayList<>();
        byDay.forEach((d, v) -> out.add(new DayPoint(d, v[0], v[1])));
        return out;
    }

    private static ZoneId zone(String tz) {
        try {
            return tz == null || tz.isBlank() ? ZoneOffset.UTC : ZoneId.of(tz);
        } catch (DateTimeException e) {
            return ZoneOffset.UTC;
        }
    }
}
