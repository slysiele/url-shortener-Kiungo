package com.kiungo.common;

import com.kiungo.auth.AuthUser;
import com.kiungo.user.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Fixed-window, per-user rate limit for API-key traffic (limit comes from the plan).
 * In-memory, so it is per instance — move to Redis when running more than one backend replica.
 */
public class RateLimitFilter extends OncePerRequestFilter {

    private record Window(long minute, AtomicInteger count) {}

    private final Map<Long, Window> windows = new ConcurrentHashMap<>();
    private final Map<Long, CachedLimit> limits = new ConcurrentHashMap<>();
    private final UserRepository users;

    private record CachedLimit(int rpm, long loadedAt) {}

    public RateLimitFilter(UserRepository users) {
        this.users = users;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AuthUser u && u.method() == AuthUser.Method.API_KEY) {
            int limit = limitFor(u.id());
            long minute = System.currentTimeMillis() / 60_000;
            Window w = windows.compute(u.id(), (k, old) ->
                old == null || old.minute() != minute ? new Window(minute, new AtomicInteger()) : old);
            int used = w.count().incrementAndGet();
            res.setHeader("X-RateLimit-Limit", String.valueOf(limit));
            res.setHeader("X-RateLimit-Remaining", String.valueOf(Math.max(0, limit - used)));
            if (used > limit) {
                res.setStatus(429);
                res.setHeader("Retry-After", String.valueOf(60 - (System.currentTimeMillis() / 1000) % 60));
                res.setContentType("application/json");
                res.getWriter().write("{\"status\":429,\"code\":\"RATE_LIMITED\",\"message\":\"Too many requests. Limit is "
                    + limit + " per minute on your plan.\"}");
                return;
            }
        }
        chain.doFilter(req, res);
    }

    private int limitFor(Long userId) {
        CachedLimit c = limits.get(userId);
        if (c == null || System.currentTimeMillis() - c.loadedAt() > 60_000) {
            int rpm = users.findById(userId).map(u -> u.effectivePlan().apiRequestsPerMinute()).orElse(0);
            c = new CachedLimit(rpm, System.currentTimeMillis());
            limits.put(userId, c);
        }
        return c.rpm();
    }
}
