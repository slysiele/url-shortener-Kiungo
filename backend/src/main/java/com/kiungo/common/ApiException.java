package com.kiungo.common;

import org.springframework.http.HttpStatus;

/** Throw from anywhere to return a clean JSON error: {status, code, message}. */
public class ApiException extends RuntimeException {
    private final HttpStatus status;
    private final String code;

    public ApiException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() { return status; }
    public String getCode() { return code; }

    public static ApiException notFound(String what) {
        return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", what + " not found");
    }

    public static ApiException badRequest(String code, String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, code, message);
    }

    /** Used when the user's plan does not allow an action. The frontend shows an upgrade prompt on this code. */
    public static ApiException planLimit(String message) {
        return new ApiException(HttpStatus.PAYMENT_REQUIRED, "PLAN_LIMIT", message);
    }
}
