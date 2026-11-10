package com.kiungo;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kiungo.user.Plan;
import com.kiungo.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles({"dev", "test"})
class FullFlowIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;

    private String register(String email) throws Exception {
        MvcResult r = mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"secret123\",\"name\":\"Test\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.user.onTrial").value(true))
            .andExpect(jsonPath("$.user.effectivePlan").value("PRO"))
            .andReturn();
        return json.readTree(r.getResponse().getContentAsString()).get("token").asText();
    }

    private JsonNode body(MvcResult r) throws Exception {
        return json.readTree(r.getResponse().getContentAsString());
    }

    @Test
    void registerShortenRedirectAndSeeStats() throws Exception {
        String token = register("flow@example.com");

        // create with a custom slug
        MvcResult created = mvc.perform(post("/api/v1/links").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"url\":\"example.com/page?x=1\",\"slug\":\"promo-1\",\"tags\":[\"Launch\",\"launch\"]}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.shortUrl").value("http://sho.rt/promo-1"))
            .andExpect(jsonPath("$.originalUrl").value("https://example.com/page?x=1"))
            .andExpect(jsonPath("$.tags.length()").value(1))
            .andReturn();
        long id = body(created).get("id").asLong();

        // duplicate slug rejected
        mvc.perform(post("/api/v1/links").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"url\":\"https://a.com\",\"slug\":\"PROMO-1\"}"))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("SLUG_TAKEN"));

        // random slug
        mvc.perform(post("/api/v1/links").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"url\":\"https://b.com\"}"))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.slug").isString());

        // redirect: human + bot, with query forwarding
        mvc.perform(get("/promo-1?utm_source=newsletter")
                .header("User-Agent", "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36")
                .header("CF-IPCountry", "KE").header("Referer", "https://www.facebook.com/"))
            .andExpect(status().isFound())
            .andExpect(header().string("Location", "https://example.com/page?x=1&utm_source=newsletter"));
        mvc.perform(get("/promo-1").header("User-Agent", "facebookexternalhit/1.1"))
            .andExpect(status().isFound());

        // unknown slug goes to the frontend's "unavailable" page
        mvc.perform(get("/nope-nope"))
            .andExpect(status().isFound())
            .andExpect(header().string("Location", org.hamcrest.Matchers.containsString("/link-unavailable?reason=not-found")));

        Thread.sleep(500); // clicks are recorded asynchronously

        mvc.perform(get("/api/v1/stats?days=7&tz=Africa/Nairobi").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.overview.totalClicks.current").value(2))
            .andExpect(jsonPath("$.overview.humanClicks.current").value(1))
            .andExpect(jsonPath("$.series.length()").value(7))
            .andExpect(jsonPath("$.countries[?(@.label == 'Kenya')]").exists())
            .andExpect(jsonPath("$.browsers[?(@.label == 'Chrome Mobile')]").exists())
            .andExpect(jsonPath("$.referrers[?(@.label == 'facebook.com')]").exists())
            .andExpect(jsonPath("$.utmSources[?(@.label == 'newsletter')]").exists());

        mvc.perform(get("/api/v1/stats/clicks").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(2));

        mvc.perform(get("/api/v1/links/" + id).header("Authorization", "Bearer " + token))
            .andExpect(jsonPath("$.clickCount").value(2));

        // QR code renders
        MvcResult qr = mvc.perform(get("/api/v1/links/" + id + "/qr").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andReturn();
        assertThat(qr.getResponse().getContentAsByteArray()).hasSizeGreaterThan(100);

        // disable → redirect to unavailable page
        mvc.perform(patch("/api/v1/links/" + id).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"active\":false}"))
            .andExpect(jsonPath("$.status").value("DISABLED"));
        mvc.perform(get("/promo-1")).andExpect(header().string("Location",
            org.hamcrest.Matchers.containsString("reason=disabled")));

        // CSV import + export
        var csv = new MockMultipartFile("file", "links.csv", "text/csv",
            "url,slug,title,tags\nhttps://one.com,csv-one,One,a;b\n\"https://two.com/?a=1,2\",,\"Two, quoted\",\n".getBytes());
        mvc.perform(multipart("/api/v1/links/import").file(csv).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andExpect(jsonPath("$.created").value(2));
        mvc.perform(get("/api/v1/links/export").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(content().string(org.hamcrest.Matchers.containsString("csv-one")));

        mvc.perform(get("/api/v1/links?q=csv").header("Authorization", "Bearer " + token))
            .andExpect(jsonPath("$.total").value(1));
    }

    @Test
    void apiKeysWorkAndAreRestrictedByPlan() throws Exception {
        String token = register("api@example.com");

        MvcResult k = mvc.perform(post("/api/v1/api-keys").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"SMS campaigns\"}"))
            .andExpect(status().isCreated()).andReturn();
        String secret = body(k).get("secret").asText();
        assertThat(secret).startsWith("kk_live_");

        mvc.perform(post("/api/v1/links").header("X-API-Key", secret)
                .contentType(MediaType.APPLICATION_JSON).content("{\"url\":\"https://via-api.com\"}"))
            .andExpect(status().isCreated())
            .andExpect(header().exists("X-RateLimit-Remaining"));

        // an API key cannot create more API keys
        mvc.perform(post("/api/v1/api-keys").header("X-API-Key", secret)
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isForbidden());

        mvc.perform(get("/api/v1/links").header("X-API-Key", "kk_live_wrong")).andExpect(status().isUnauthorized());

        // trial over, no paid plan → Free → no API access, monthly quota applies
        var u = users.findByEmailIgnoreCase("api@example.com").orElseThrow();
        u.setTrialEndsAt(Instant.now().minusSeconds(5));
        users.save(u);
        mvc.perform(get("/api/v1/links").header("X-API-Key", secret)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + token))
            .andExpect(jsonPath("$.effectivePlan").value("FREE"));
        mvc.perform(post("/api/v1/links").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"url\":\"https://x.com\",\"iosUrl\":\"https://apps.apple.com/app/x\"}"))
            .andExpect(status().isPaymentRequired()).andExpect(jsonPath("$.code").value("PLAN_LIMIT"));

        // mock checkout upgrades instantly
        mvc.perform(post("/api/v1/billing/checkout").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"plan\":\"STARTER\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.profile.effectivePlan").value("STARTER"));
        assertThat(users.findByEmailIgnoreCase("api@example.com").orElseThrow().getPlan()).isEqualTo(Plan.STARTER);
    }

    @Test
    void validationAndAuthErrorsAreClean() throws Exception {
        mvc.perform(get("/api/v1/links")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"bad\",\"password\":\"x\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.fields.email").exists())
            .andExpect(jsonPath("$.fields.password").exists());
        String token = register("val@example.com");
        mvc.perform(post("/api/v1/links").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"url\":\"javascript:alert(1)\"}"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_URL"));
        mvc.perform(post("/api/v1/links").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"url\":\"https://a.com\",\"slug\":\"api\"}"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_SLUG"));
        mvc.perform(get("/api/v1/billing/plans")).andExpect(status().isOk())
            .andExpect(jsonPath("$.plans.length()").value(4));
        mvc.perform(get("/v3/api-docs")).andExpect(status().isOk());
    }
}
