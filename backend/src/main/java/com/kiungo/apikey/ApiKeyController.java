package com.kiungo.apikey;

import com.kiungo.apikey.ApiKeyService.ApiKeyView;
import com.kiungo.apikey.ApiKeyService.CreatedKey;
import com.kiungo.auth.AuthUser;
import com.kiungo.common.ApiException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/api-keys")
@Tag(name = "API keys", description = "Manage keys for integrations (dashboard sign-in required)")
public class ApiKeyController {

    public record CreateKeyRequest(@Size(max = 120) String name, @Max(3650) Integer expiresInDays) {}

    private final ApiKeyService service;

    public ApiKeyController(ApiKeyService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "List active keys")
    public List<ApiKeyView> list() {
        return service.list(dashboardUser());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a key — the secret is returned only once")
    public CreatedKey create(@Valid @RequestBody CreateKeyRequest req) {
        return service.create(dashboardUser(), req.name(), req.expiresInDays());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Revoke a key")
    public void revoke(@PathVariable Long id) {
        service.revoke(dashboardUser(), id);
    }

    /** A leaked API key must not be able to mint more keys, so only JWT sessions may manage keys. */
    private static Long dashboardUser() {
        AuthUser u = AuthUser.current();
        if (u.method() != AuthUser.Method.JWT) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "API keys can only be managed from the dashboard");
        }
        return u.id();
    }
}
