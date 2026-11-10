package com.kiungo.analytics;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class StatsDtos {
    private StatsDtos() {}

    public record Metric(long current, long previous) {}

    public record Overview(
        Metric totalClicks,
        Metric humanClicks,
        Metric uniqueVisitors,
        Metric linksCreated,
        double avgClicksPerLink) {}

    public record DayPoint(LocalDate date, long clicks, long human) {}

    public record Bucket(String label, long clicks) {}

    public record StatsResponse(
        int days,
        boolean clampedByPlan,
        Instant from,
        Instant to,
        Overview overview,
        List<DayPoint> series,
        List<Bucket> topLinks,
        List<Bucket> countries,
        List<Bucket> cities,
        List<Bucket> browsers,
        List<Bucket> os,
        List<Bucket> devices,
        List<Bucket> referrers,
        List<Bucket> utmSources,
        List<Bucket> utmMediums,
        List<Bucket> utmCampaigns) {}

    public record ClickEventView(
        Long id, Instant clickedAt, String slug, String shortUrl, boolean bot, String country, String city,
        String referrer, String browser, String os, String device, String utmSource) {}
}
