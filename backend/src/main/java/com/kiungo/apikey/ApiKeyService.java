package com.kiungo.apikey;

import com.kiungo.auth.AuthUser;
import com.kiungo.common.ApiException;
import com.kiungo.user.User;
import com.kiungo.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

@Service
public class ApiKeyService {

    public static final String KEY_PREFIX = "kk_live_";
    private static final SecureRandom RANDOM = new SecureRandom();

    public record ApiKeyView(Long id, String name, String prefix, Instant createdAt, Instant lastUsedAt, Instant expiresAt) {}

    /** Returned once on creation — the only time the full key is visible. */
    public record CreatedKey(ApiKeyView key, String secret) {}

    private final ApiKeyRepository keys;
    private final UserRepository users;

    public ApiKeyService(ApiKeyRepository keys, UserRepository users) {
        this.keys = keys;
        this.users = users;
    }

    @Transactional
    public CreatedKey create(Long userId, String name, Integer expiresInDays) {
        User user = users.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
        if (!user.effectivePlan().apiAccess()) {
            throw ApiException.planLimit("API access needs the Starter plan or higher");
        }
        if (keys.findByUserIdAndRevokedFalseOrderByCreatedAtDesc(userId).size() >= 20) {
            throw ApiException.badRequest("TOO_MANY_KEYS", "You can have at most 20 active keys");
        }
        byte[] raw = new byte[24];
        RANDOM.nextBytes(raw);
        String secret = KEY_PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(raw);

        ApiKey k = new ApiKey();
        k.setUserId(userId);
        k.setName(name == null || name.isBlank() ? "API key" : name.trim());
        k.setPrefix(secret.substring(0, KEY_PREFIX.length() + 4));
        k.setKeyHash(sha256(secret));
        if (expiresInDays != null && expiresInDays > 0) {
            k.setExpiresAt(Instant.now().plus(Duration.ofDays(expiresInDays)));
        }
        keys.save(k);
        return new CreatedKey(view(k), secret);
    }

    public List<ApiKeyView> list(Long userId) {
        return keys.findByUserIdAndRevokedFalseOrderByCreatedAtDesc(userId).stream().map(this::view).toList();
    }

    @Transactional
    public void revoke(Long userId, Long id) {
        keys.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("API key")).setRevoked(true);
    }

    /** Called by ApiKeyAuthFilter on every request carrying X-API-Key. */
    @Transactional
    public Optional<AuthUser> authenticate(String secret) {
        if (!secret.startsWith(KEY_PREFIX)) return Optional.empty();
        return keys.findByKeyHash(sha256(secret))
            .filter(ApiKey::usable)
            .flatMap(k -> users.findById(k.getUserId())
                .filter(u -> u.effectivePlan().apiAccess()) // downgraded accounts lose API access
                .map(u -> {
                    if (k.getLastUsedAt() == null || k.getLastUsedAt().isBefore(Instant.now().minusSeconds(60))) {
                        k.setLastUsedAt(Instant.now());
                    }
                    return new AuthUser(u.getId(), u.getEmail(), AuthUser.Method.API_KEY);
                }));
    }

    private ApiKeyView view(ApiKey k) {
        return new ApiKeyView(k.getId(), k.getName(), k.getPrefix(), k.getCreatedAt(), k.getLastUsedAt(), k.getExpiresAt());
    }

    static String sha256(String s) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
