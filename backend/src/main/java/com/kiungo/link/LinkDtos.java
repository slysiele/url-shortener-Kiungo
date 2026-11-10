package com.kiungo.link;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

public final class LinkDtos {
    private LinkDtos() {}

    public record CreateLinkRequest(
        @NotBlank @Size(max = 2048) String url,
        @Size(max = 64) String slug,
        @Size(max = 255) String title,
        List<String> tags,
        @Size(max = 2048) String iosUrl,
        @Size(max = 2048) String androidUrl,
        Instant expiresAt,
        @Positive Long maxClicks) {}

    /** All fields optional — only non-null fields are changed. Send an empty string to clear a text field. */
    public record UpdateLinkRequest(
        @Size(max = 2048) String url,
        @Size(max = 64) String slug,
        @Size(max = 255) String title,
        List<String> tags,
        @Size(max = 2048) String iosUrl,
        @Size(max = 2048) String androidUrl,
        Instant expiresAt,
        Boolean clearExpiry,
        @Positive Long maxClicks,
        Boolean clearMaxClicks,
        Boolean active) {}

    public record LinkResponse(
        Long id,
        String slug,
        String shortUrl,
        String originalUrl,
        String title,
        List<String> tags,
        String iosUrl,
        String androidUrl,
        Instant expiresAt,
        Long maxClicks,
        long clickCount,
        boolean active,
        Link.Status status,
        Instant createdAt) {}

    public record BulkCreateRequest(@Size(min = 1, max = 500) List<CreateLinkRequest> links) {}

    public record BulkResult(int row, boolean ok, LinkResponse link, String error) {}

    public record BulkResponse(int created, int failed, List<BulkResult> results) {}

    public record PageResponse<T>(List<T> items, int page, int size, long total, int totalPages) {}
}
