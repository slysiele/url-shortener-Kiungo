package com.kiungo.auth;

import com.kiungo.common.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/** The authenticated principal placed in the SecurityContext by the JWT or API-key filter. */
public record AuthUser(Long id, String email, Method method) {

    public enum Method { JWT, API_KEY }

    public static AuthUser current() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AuthUser u) return u;
        throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required");
    }
}
