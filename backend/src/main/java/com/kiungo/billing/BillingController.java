package com.kiungo.billing;

import com.kiungo.auth.AuthDtos.Profile;
import com.kiungo.auth.AuthService;
import com.kiungo.auth.AuthUser;
import com.kiungo.common.ApiException;
import com.kiungo.config.AppProperties;
import com.kiungo.user.Plan;
import com.kiungo.user.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;

/**
 * Plans and subscriptions.
 *
 * Phase 1 (now): BILLING_MODE=mock — "upgrading" applies instantly so the whole product can be tested.
 * Phase 3: replace {@link #checkout} with a Paystack (M-Pesa + cards, good for Kenya) or Stripe checkout
 * session, and set the plan from the provider's webhook instead. See docs/PLAN.md → Commercialisation.
 */
@RestController
@RequestMapping("/api/v1/billing")
@Tag(name = "Billing", description = "Plans and subscription")
public class BillingController {

    public record PlanView(String id, String name, int priceUsdCents, int linksPerMonth, int analyticsDays,
                           int apiRequestsPerMinute, boolean apiAccess, boolean csvImport, boolean deviceTargeting) {}

    public record PlansResponse(int trialDays, String trialPlan, List<PlanView> plans) {}

    public record CheckoutRequest(@NotNull Plan plan) {}

    public record CheckoutResponse(String mode, String redirectUrl, Profile profile) {}

    private final AuthService auth;
    private final AppProperties props;

    public BillingController(AuthService auth, AppProperties props) {
        this.auth = auth;
        this.props = props;
    }

    @GetMapping("/plans")
    @Operation(summary = "Public price list")
    public PlansResponse plans() {
        var plans = Arrays.stream(Plan.values()).map(p -> new PlanView(p.name(), p.displayName(), p.priceUsdCents(),
            p.linksPerMonth(), p.analyticsDays(), p.apiRequestsPerMinute(), p.apiAccess(), p.csvImport(),
            p.deviceTargeting())).toList();
        return new PlansResponse(props.trialDays(), User.TRIAL_PLAN.name(), plans);
    }

    @PostMapping("/checkout")
    @Transactional
    @Operation(summary = "Start a subscription to a plan")
    public CheckoutResponse checkout(@Valid @RequestBody CheckoutRequest req) {
        User u = auth.load(AuthUser.current().id());
        if (!props.billing().isMock()) {
            throw new ApiException(HttpStatus.NOT_IMPLEMENTED, "BILLING_NOT_CONFIGURED",
                "Online payments are coming soon. Contact sales to upgrade.");
        }
        u.setPlan(req.plan());
        u.setPlanRenewsAt(req.plan() == Plan.FREE ? null : Instant.now().plus(Duration.ofDays(30)));
        if (req.plan() != Plan.FREE) u.setTrialEndsAt(null); // trial ends once you pay
        return new CheckoutResponse("mock", null, auth.profile(u));
    }

    @PostMapping("/cancel")
    @Transactional
    @Operation(summary = "Cancel subscription (back to Free at the end of the period)")
    public Profile cancel() {
        User u = auth.load(AuthUser.current().id());
        if (props.billing().isMock()) {
            u.setPlan(Plan.FREE);
            u.setPlanRenewsAt(null);
        }
        return auth.profile(u);
    }
}
