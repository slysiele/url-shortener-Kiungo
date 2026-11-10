package com.kiungo.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String baseUrl,
        String frontendUrl,
        List<String> corsAllowedOrigins,
        Jwt jwt,
        int trialDays,
        String ipHashSalt,
        Billing billing
) {
    public record Jwt(String secret, int ttlHours) {}

    public record Billing(String mode) {
        public boolean isMock() {
            return "mock".equalsIgnoreCase(mode);
        }
    }
}
