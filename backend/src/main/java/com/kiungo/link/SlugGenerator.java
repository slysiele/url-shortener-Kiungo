package com.kiungo.link;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.Set;
import java.util.regex.Pattern;

@Component
public class SlugGenerator {

    private static final String ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/l/I
    private static final SecureRandom RANDOM = new SecureRandom();
    public static final Pattern VALID = Pattern.compile("^[A-Za-z0-9_-]{3,64}$");

    /** Paths the backend/frontend already use; nobody may claim them as a custom slug. */
    private static final Set<String> RESERVED = Set.of(
        "api", "swagger-ui", "swagger", "v3", "actuator", "h2-console", "admin", "login", "logout",
        "register", "signup", "dashboard", "app", "docs", "pricing", "settings", "static", "assets",
        "health", "favicon.ico", "robots.txt", "www");

    public String random(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) sb.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        return sb.toString();
    }

    public boolean isValidCustom(String slug) {
        return slug != null && VALID.matcher(slug).matches() && !RESERVED.contains(slug.toLowerCase());
    }
}
