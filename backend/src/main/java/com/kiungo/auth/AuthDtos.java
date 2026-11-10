package com.kiungo.auth;

import com.kiungo.user.Plan;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public final class AuthDtos {
    private AuthDtos() {}

    public record RegisterRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, max = 100, message = "must be at least 8 characters") String password,
        @Size(max = 120) String name) {}

    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {}

    public record UpdateProfileRequest(@Size(max = 120) String name, @Size(max = 30) String theme) {}

    public record ChangePasswordRequest(
        @NotBlank String currentPassword,
        @NotBlank @Size(min = 8, max = 100, message = "must be at least 8 characters") String newPassword) {}

    public record AuthResponse(String token, Profile user) {}

    public record Profile(
        Long id,
        String email,
        String name,
        String theme,
        Plan plan,              // what they pay for
        Plan effectivePlan,     // what limits apply now (trial gives PRO)
        boolean onTrial,
        Instant trialEndsAt,
        Instant planRenewsAt,
        Usage usage,
        Instant createdAt) {}

    public record Usage(long linksThisMonth, int linksPerMonthLimit, long totalLinks, long totalClicks) {}
}
