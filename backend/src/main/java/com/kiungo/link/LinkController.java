package com.kiungo.link;

import com.kiungo.auth.AuthUser;
import com.kiungo.common.ApiException;
import com.kiungo.link.LinkDtos.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/v1/links")
@Tag(name = "Links", description = "Create, list, update and delete short links")
public class LinkController {

    private final LinkService service;
    private final CsvService csv;
    private final QrService qr;

    public LinkController(LinkService service, CsvService csv, QrService qr) {
        this.service = service;
        this.csv = csv;
        this.qr = qr;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Shorten a URL", description = "Omit `slug` to get a random 7-character one.")
    public LinkResponse create(@Valid @RequestBody CreateLinkRequest req) {
        return service.create(AuthUser.current().id(), req);
    }

    @PostMapping("/bulk")
    @Operation(summary = "Create up to 500 links in one call (Starter plan+)")
    public BulkResponse bulk(@Valid @RequestBody BulkCreateRequest req) {
        return service.bulkCreate(AuthUser.current().id(), req.links());
    }

    @GetMapping
    @Operation(summary = "List your links (newest first)", description = "`q` searches slug, URL, title and tags.")
    public PageResponse<LinkResponse> list(@RequestParam(required = false) String q,
                                           @RequestParam(defaultValue = "0") int page,
                                           @RequestParam(defaultValue = "20") int size) {
        return service.list(AuthUser.current().id(), q, page, size);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get one link by id")
    public LinkResponse get(@PathVariable Long id) {
        return service.toResponse(service.get(AuthUser.current().id(), id));
    }

    @GetMapping("/by-slug/{slug}")
    @Operation(summary = "Get one link by its slug")
    public LinkResponse getBySlug(@PathVariable String slug) {
        return service.toResponse(service.getBySlug(AuthUser.current().id(), slug));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Update a link (only the fields you send change)")
    public LinkResponse update(@PathVariable Long id, @Valid @RequestBody UpdateLinkRequest req) {
        return service.update(AuthUser.current().id(), id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a link and its click history")
    public void delete(@PathVariable Long id) {
        service.delete(AuthUser.current().id(), id);
    }

    @GetMapping(value = "/{id}/qr", produces = MediaType.IMAGE_PNG_VALUE)
    @Operation(summary = "QR code PNG for a link", description = "Optional `size` (128-2048), `fg` and `bg` hex colours.")
    public ResponseEntity<byte[]> qrCode(@PathVariable Long id,
                                         @RequestParam(defaultValue = "512") int size,
                                         @RequestParam(required = false) String fg,
                                         @RequestParam(required = false) String bg) {
        Link link = service.get(AuthUser.current().id(), id);
        byte[] png = qr.png(service.shortUrl(link), size, fg, bg);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + link.getSlug() + ".png\"")
            .contentType(MediaType.IMAGE_PNG).body(png);
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Import links from a CSV file (Starter plan+)",
        description = "Header row required. Columns: url (required), slug, title, tags (separated by ; or |).")
    public BulkResponse importCsv(@RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) throw ApiException.badRequest("EMPTY_CSV", "Please choose a CSV file");
        return service.bulkCreate(AuthUser.current().id(), csv.parseImport(file.getInputStream()));
    }

    @GetMapping(value = "/export", produces = "text/csv")
    @Operation(summary = "Export all your links as CSV")
    public ResponseEntity<byte[]> exportCsv() {
        String body = csv.export(service.all(AuthUser.current().id()), service::shortUrl);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"kiungo-links.csv\"")
            .contentType(MediaType.parseMediaType("text/csv"))
            .body(body.getBytes(StandardCharsets.UTF_8));
    }
}
