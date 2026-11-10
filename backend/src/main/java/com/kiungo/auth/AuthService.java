package com.kiungo.auth;

import com.kiungo.auth.AuthDtos.*;
import com.kiungo.common.ApiException;
import com.kiungo.config.AppProperties;
import com.kiungo.link.LinkRepository;
import com.kiungo.user.User;
import com.kiungo.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;

@Service
public class AuthService {

    private final UserRepository users;
    private final LinkRepository links;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final AppProperties props;

    public AuthService(UserRepository users, LinkRepository links, PasswordEncoder encoder,
                       JwtService jwt, AppProperties props) {
        this.users = users;
        this.links = links;
        this.encoder = encoder;
        this.jwt = jwt;
        this.props = props;
    }

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        String email = req.email().trim().toLowerCase();
        if (users.existsByEmailIgnoreCase(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "EMAIL_TAKEN", "An account with this email already exists");
        }
        User u = new User();
        u.setEmail(email);
        u.setName(req.name());
        u.setPasswordHash(encoder.encode(req.password()));
        u.setTrialEndsAt(Instant.now().plus(Duration.ofDays(props.trialDays())));
        users.save(u);
        return new AuthResponse(jwt.issue(u.getId(), u.getEmail()), profile(u));
    }

    public AuthResponse login(LoginRequest req) {
        User u = users.findByEmailIgnoreCase(req.email().trim())
            .filter(x -> encoder.matches(req.password(), x.getPasswordHash()))
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "BAD_CREDENTIALS", "Wrong email or password"));
        return new AuthResponse(jwt.issue(u.getId(), u.getEmail()), profile(u));
    }

    public Profile me(Long userId) {
        return profile(load(userId));
    }

    @Transactional
    public Profile update(Long userId, UpdateProfileRequest req) {
        User u = load(userId);
        if (req.name() != null) u.setName(req.name());
        if (req.theme() != null) u.setTheme(req.theme());
        return profile(u);
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest req) {
        User u = load(userId);
        if (!encoder.matches(req.currentPassword(), u.getPasswordHash())) {
            throw ApiException.badRequest("BAD_CREDENTIALS", "Current password is wrong");
        }
        u.setPasswordHash(encoder.encode(req.newPassword()));
    }

    public User load(Long userId) {
        return users.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
    }

    public Profile profile(User u) {
        Instant monthStart = YearMonth.now(ZoneOffset.UTC).atDay(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        Usage usage = new Usage(
            links.countByUserIdAndCreatedAtAfter(u.getId(), monthStart),
            u.effectivePlan().linksPerMonth(),
            links.countByUserId(u.getId()),
            links.sumClicksByUserId(u.getId()));
        return new Profile(u.getId(), u.getEmail(), u.getName(), u.getTheme(), u.getPlan(), u.effectivePlan(),
            u.isOnTrial(), u.getTrialEndsAt(), u.getPlanRenewsAt(), usage, u.getCreatedAt());
    }
}
