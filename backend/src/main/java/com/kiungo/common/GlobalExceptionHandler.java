package com.kiungo.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    public record ErrorBody(int status, String code, String message, Map<String, String> fields) {}

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorBody> handleApi(ApiException ex) {
        return ResponseEntity.status(ex.getStatus())
            .body(new ErrorBody(ex.getStatus().value(), ex.getCode(), ex.getMessage(), null));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorBody> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fields = ex.getBindingResult().getFieldErrors().stream()
            .collect(Collectors.toMap(f -> f.getField(),
                f -> f.getDefaultMessage() == null ? "invalid" : f.getDefaultMessage(), (a, b) -> a));
        return ResponseEntity.badRequest()
            .body(new ErrorBody(400, "VALIDATION_FAILED", "Some fields are invalid", fields));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorBody> handleDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(new ErrorBody(403, "FORBIDDEN", ex.getMessage(), null));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorBody> handleOther(Exception ex) {
        // Spring's own web exceptions (404 no resource, 405, bad JSON, missing params...) carry a status.
        if (ex instanceof org.springframework.web.ErrorResponse er) {
            int status = er.getStatusCode().value();
            return ResponseEntity.status(status)
                .body(new ErrorBody(status, "REQUEST_ERROR", er.getBody().getDetail(), null));
        }
        if (ex instanceof org.springframework.http.converter.HttpMessageNotReadableException) {
            return ResponseEntity.badRequest().body(new ErrorBody(400, "BAD_JSON", "Malformed request body", null));
        }
        log.error("Unhandled error", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(new ErrorBody(500, "INTERNAL_ERROR", "Something went wrong", null));
    }
}
