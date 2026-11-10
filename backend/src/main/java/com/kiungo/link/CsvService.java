package com.kiungo.link;

import com.kiungo.common.ApiException;
import com.kiungo.link.LinkDtos.CreateLinkRequest;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * Minimal RFC-4180 CSV reader/writer (handles quotes, commas and newlines inside quotes).
 * Import columns (header row required, case-insensitive): url, slug, title, tags
 * Also accepts Bitly-style headers: long_url / original url / destination.
 */
@Service
public class CsvService {

    private static final int MAX_ROWS = 500;

    public List<CreateLinkRequest> parseImport(InputStream in) throws IOException {
        List<List<String>> rows = parse(new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8)));
        if (rows.isEmpty()) throw ApiException.badRequest("EMPTY_CSV", "The CSV file is empty");

        List<String> header = rows.get(0).stream().map(h -> h.trim().toLowerCase().replace("﻿", "")).toList();
        int urlCol = indexOf(header, "url", "long_url", "original url", "original_url", "destination", "long url");
        if (urlCol < 0) throw ApiException.badRequest("CSV_NO_URL_COLUMN", "CSV needs a header row with a 'url' column");
        int slugCol = indexOf(header, "slug", "short code", "back-half", "path");
        int titleCol = indexOf(header, "title", "name");
        int tagsCol = indexOf(header, "tags", "tag");

        List<CreateLinkRequest> out = new ArrayList<>();
        for (int i = 1; i < rows.size(); i++) {
            List<String> r = rows.get(i);
            String url = cell(r, urlCol);
            if (url == null) continue;
            String tags = cell(r, tagsCol);
            List<String> tagList = tags == null ? null : Arrays.asList(tags.split("[;|,]"));
            out.add(new CreateLinkRequest(url, cell(r, slugCol), cell(r, titleCol), tagList,
                null, null, null, null));
        }
        if (out.isEmpty()) throw ApiException.badRequest("EMPTY_CSV", "No rows with a URL were found");
        if (out.size() > MAX_ROWS) throw ApiException.badRequest("CSV_TOO_LARGE", "Max " + MAX_ROWS + " rows per import");
        return out;
    }

    public String export(List<Link> links, java.util.function.Function<Link, String> shortUrl) {
        StringBuilder sb = new StringBuilder("short_url,slug,original_url,title,tags,clicks,status,created_at,expires_at\n");
        for (Link l : links) {
            sb.append(esc(shortUrl.apply(l))).append(',')
              .append(esc(l.getSlug())).append(',')
              .append(esc(l.getOriginalUrl())).append(',')
              .append(esc(l.getTitle())).append(',')
              .append(esc(l.getTags() == null ? "" : l.getTags().replace(",", ";"))).append(',')
              .append(l.getClickCount()).append(',')
              .append(l.status()).append(',')
              .append(l.getCreatedAt()).append(',')
              .append(l.getExpiresAt() == null ? "" : l.getExpiresAt().toString()).append('\n');
        }
        return sb.toString();
    }

    // ---------------------------------------------------------------------------------------------

    static List<List<String>> parse(BufferedReader reader) throws IOException {
        List<List<String>> rows = new ArrayList<>();
        List<String> row = new ArrayList<>();
        StringBuilder field = new StringBuilder();
        boolean inQuotes = false;
        int c;
        while ((c = reader.read()) != -1) {
            char ch = (char) c;
            if (inQuotes) {
                if (ch == '"') {
                    reader.mark(1);
                    int next = reader.read();
                    if (next == '"') field.append('"');
                    else { inQuotes = false; if (next != -1) reader.reset(); }
                } else field.append(ch);
            } else if (ch == '"') inQuotes = true;
            else if (ch == ',') { row.add(field.toString()); field.setLength(0); }
            else if (ch == '\n' || ch == '\r') {
                if (ch == '\r') { reader.mark(1); if (reader.read() != '\n') reader.reset(); }
                row.add(field.toString()); field.setLength(0);
                if (!(row.size() == 1 && row.get(0).isBlank())) rows.add(row);
                row = new ArrayList<>();
            } else field.append(ch);
        }
        if (field.length() > 0 || !row.isEmpty()) { row.add(field.toString()); rows.add(row); }
        return rows;
    }

    private static int indexOf(List<String> header, String... names) {
        for (String n : names) { int i = header.indexOf(n); if (i >= 0) return i; }
        return -1;
    }

    private static String cell(List<String> row, int col) {
        if (col < 0 || col >= row.size()) return null;
        String v = row.get(col).trim();
        return v.isEmpty() ? null : v;
    }

    private static String esc(String v) {
        if (v == null) return "";
        // Neutralise spreadsheet formula injection
        if (!v.isEmpty() && "=+-@".indexOf(v.charAt(0)) >= 0) v = "'" + v;
        if (v.contains(",") || v.contains("\"") || v.contains("\n")) return "\"" + v.replace("\"", "\"\"") + "\"";
        return v;
    }
}
