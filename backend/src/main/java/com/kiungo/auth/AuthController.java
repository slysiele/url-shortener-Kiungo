package com.kiungo.auth;

import com.kiungo.auth.AuthDtos.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Account", description = "Sign up, sign in and profile")
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create an account (starts the free trial)")
    public AuthResponse register(@Valid @RequestBody RegisterRequest req) {
        return auth.register(req);
    }

    @PostMapping("/login")
    @Operation(summary = "Sign in and receive a JWT")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        return auth.login(req);
    }

    @GetMapping("/me")
    @Operation(summary = "Current user, plan and usage")
    public Profile me() {
        return auth.me(AuthUser.current().id());
    }

    @PatchMapping("/me")
    @Operation(summary = "Update name or theme")
    public Profile update(@Valid @RequestBody UpdateProfileRequest req) {
        return auth.update(AuthUser.current().id(), req);
    }

    @PostMapping("/me/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Change password")
    public void changePassword(@Valid @RequestBody ChangePasswordRequest req) {
        auth.changePassword(AuthUser.current().id(), req);
    }
}
