package com.kiungo.config;

import com.kiungo.analytics.Click;
import com.kiungo.analytics.ClickRepository;
import com.kiungo.link.Link;
import com.kiungo.link.LinkRepository;
import com.kiungo.link.SlugGenerator;
import com.kiungo.user.User;
import com.kiungo.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Local development only: creates demo@kiungo.dev / demo1234 with realistic links and clicks
 * so the dashboard isn't empty on first run. Enabled by app.seed-demo=true (on in the dev profile).
 */
@Component
@ConditionalOnProperty(name = "app.seed-demo", havingValue = "true")
public class DemoDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private final UserRepository users;
    private final LinkRepository links;
    private final ClickRepository clicks;
    private final PasswordEncoder encoder;
    private final SlugGenerator slugs;

    public DemoDataSeeder(UserRepository users, LinkRepository links, ClickRepository clicks,
                          PasswordEncoder encoder, SlugGenerator slugs) {
        this.users = users;
        this.links = links;
        this.clicks = clicks;
        this.encoder = encoder;
        this.slugs = slugs;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (users.existsByEmailIgnoreCase("demo@kiungo.dev")) return;
        Random rnd = new Random(42);

        User u = new User();
        u.setEmail("demo@kiungo.dev");
        u.setName("Demo User");
        u.setPasswordHash(encoder.encode("demo1234"));
        u.setTrialEndsAt(Instant.now().plus(Duration.ofDays(14)));
        users.save(u);

        String[][] samples = {
            {"https://shop.example.co.ke/black-friday?utm_source=sms", "Black Friday SMS blast", "sales,sms"},
            {"https://example.com/blog/how-we-scaled", "Engineering blog post", "blog"},
            {"https://docs.example.com/getting-started", "Getting started guide", "docs"},
            {"https://forms.example.com/feedback", "Customer feedback form", "survey"},
            {"https://example.com/webinar/register", "Webinar registration", "events,marketing"},
            {"https://play.google.com/store/apps/details?id=com.example", "Android app", "app"},
            {"https://example.com/careers", "We're hiring", "hr"},
            {"https://example.com/pricing", "Pricing page", "sales"},
        };
        List<Link> created = new ArrayList<>();
        for (int i = 0; i < 24; i++) {
            String[] s = samples[i % samples.length];
            Link l = new Link();
            l.setUser(u);
            l.setSlug(slugs.random(7));
            l.setOriginalUrl(s[0] + (s[0].contains("?") ? "&" : "?") + "ref=" + i);
            l.setTitle(i < samples.length ? s[1] : s[1] + " #" + (i / samples.length + 1));
            l.setTags(s[2]);
            created.add(links.save(l));
        }

        String[] countries = {"Kenya", "Kenya", "Kenya", "Kenya", "Kenya", "Kenya", "Uganda", "Tanzania", "South Africa", "United States", "Nigeria", "India"};
        String[] cities = {"Nairobi", "Nairobi", "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", null};
        String[][] agents = {
            {"Chrome Mobile", "Android", "Mobile"}, {"Chrome Mobile", "Android", "Mobile"}, {"Chrome Mobile", "Android", "Mobile"},
            {"Samsung Internet", "Android", "Mobile"}, {"Opera Mobile", "Android", "Mobile"}, {"Mobile Safari", "iOS", "Mobile"},
            {"Chrome", "Windows", "Desktop"}, {"Safari", "macOS", "Desktop"}, {"Chrome WebView", "Android", "Mobile"}};
        String[] referrers = {null, null, null, "facebook.com", "t.co", "l.instagram.com", "whatsapp.com", "google.com", "linkedin.com"};
        String[] utm = {null, null, "sms", "newsletter", "facebook", "whatsapp"};

        Instant now = Instant.now();
        List<Click> batch = new ArrayList<>();
        for (int day = 28; day >= 0; day--) {
            // two campaign spikes like a real account
            int base = 15 + rnd.nextInt(20);
            if (day == 22 || day == 6) base += 140;
            if (day == 21 || day == 5 || day == 7) base += 60;
            for (int n = 0; n < base; n++) {
                Link l = created.get((int) Math.min(created.size() - 1, Math.abs(rnd.nextGaussian()) * 6));
                Click c = new Click();
                c.setLink(l);
                c.setUserId(u.getId());
                c.setClickedAt(now.minus(Duration.ofDays(day)).minusSeconds(rnd.nextInt(86_000)));
                boolean bot = rnd.nextInt(100) < 18;
                c.setBot(bot);
                c.setCountry(countries[rnd.nextInt(countries.length)]);
                c.setCity("Kenya".equals(c.getCountry()) ? cities[rnd.nextInt(cities.length)] : null);
                if (bot) {
                    c.setBrowser(rnd.nextBoolean() ? "FacebookBot" : "WhatsApp preview");
                    c.setOs("Unknown");
                    c.setDevice("Bot");
                } else {
                    String[] a = agents[rnd.nextInt(agents.length)];
                    c.setBrowser(a[0]); c.setOs(a[1]); c.setDevice(a[2]);
                }
                c.setReferrerDomain(referrers[rnd.nextInt(referrers.length)]);
                c.setUtmSource(utm[rnd.nextInt(utm.length)]);
                c.setIpHash(Integer.toHexString(rnd.nextInt(900)));
                batch.add(c);
            }
        }
        clicks.saveAll(batch);
        batch.stream().collect(java.util.stream.Collectors.groupingBy(c -> c.getLink().getId(), java.util.stream.Collectors.counting()))
            .forEach(links::addClicks);
        log.info("Seeded demo account demo@kiungo.dev / demo1234 with {} links and {} clicks", created.size(), batch.size());
    }
}
