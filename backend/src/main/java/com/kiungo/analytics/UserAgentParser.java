package com.kiungo.analytics;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Lightweight user-agent classifier — good enough for dashboards without pulling in a big library.
 * Order of checks matters (e.g. Edge and Opera UAs also contain "Chrome").
 */
public final class UserAgentParser {

    public record Result(String browser, String os, String device, boolean bot) {}

    private static final Map<String, String> BOTS = new LinkedHashMap<>();
    static {
        BOTS.put("facebookexternalhit", "FacebookBot");
        BOTS.put("facebot", "FacebookBot");
        BOTS.put("whatsapp", "WhatsApp preview");
        BOTS.put("telegrambot", "TelegramBot");
        BOTS.put("twitterbot", "TwitterBot");
        BOTS.put("linkedinbot", "LinkedInBot");
        BOTS.put("slackbot", "SlackBot");
        BOTS.put("discordbot", "DiscordBot");
        BOTS.put("googlebot", "GoogleBot");
        BOTS.put("bingbot", "BingBot");
        BOTS.put("applebot", "AppleBot");
        BOTS.put("yandex", "YandexBot");
        BOTS.put("baiduspider", "BaiduSpider");
        BOTS.put("headlesschrome", "Headless Chrome");
        BOTS.put("curl/", "curl");
        BOTS.put("wget/", "wget");
        BOTS.put("python-requests", "Python");
        BOTS.put("go-http-client", "Go client");
        BOTS.put("postmanruntime", "Postman");
    }

    private UserAgentParser() {}

    public static Result parse(String ua) {
        if (ua == null || ua.isBlank()) return new Result("Unknown", "Unknown", "Unknown", true);
        String s = ua.toLowerCase(Locale.ROOT);

        for (var e : BOTS.entrySet()) {
            if (s.contains(e.getKey())) return new Result(e.getValue(), os(s), "Bot", true);
        }
        if (s.matches(".*(bot|crawler|spider|crawl|slurp|preview|monitor).*")) {
            return new Result("Other bot", os(s), "Bot", true);
        }

        String os = os(s);
        boolean tablet = s.contains("ipad") || (s.contains("android") && !s.contains("mobile")) || s.contains("tablet");
        boolean mobile = !tablet && (s.contains("mobi") || s.contains("iphone") || s.contains("android"));
        String device = tablet ? "Tablet" : mobile ? "Mobile" : "Desktop";
        return new Result(browser(s, mobile || tablet), os, device, false);
    }

    private static String browser(String s, boolean mobile) {
        if (s.contains("fban") || s.contains("fbav")) return "Facebook in-app";
        if (s.contains("instagram")) return "Instagram in-app";
        if (s.contains("edg/") || s.contains("edga/") || s.contains("edgios/")) return mobile ? "Edge Mobile" : "Edge";
        if (s.contains("opr/") || s.contains("opera")) return mobile ? "Opera Mobile" : "Opera";
        if (s.contains("samsungbrowser")) return "Samsung Internet";
        if (s.contains("firefox/") || s.contains("fxios/")) return mobile ? "Firefox Mobile" : "Firefox";
        if (s.contains("crios/")) return "Chrome Mobile iOS";
        if (s.contains("; wv)")) return "Chrome WebView";
        if (s.contains("chrome/")) return mobile ? "Chrome Mobile" : "Chrome";
        if (s.contains("safari/")) return mobile ? "Mobile Safari" : "Safari";
        return "Other";
    }

    private static String os(String s) {
        if (s.contains("windows")) return "Windows";
        if (s.contains("android")) return "Android";
        if (s.contains("iphone") || s.contains("ipad") || s.contains("ipod")) return "iOS";
        if (s.contains("cros")) return "ChromeOS";
        if (s.contains("mac os x") || s.contains("macintosh")) return "macOS";
        if (s.contains("linux")) return "Linux";
        return "Unknown";
    }
}
