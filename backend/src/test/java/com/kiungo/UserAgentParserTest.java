package com.kiungo;

import com.kiungo.analytics.UserAgentParser;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class UserAgentParserTest {

    @Test
    void classifiesCommonAgents() {
        var android = UserAgentParser.parse("Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36");
        assertThat(android.browser()).isEqualTo("Chrome Mobile");
        assertThat(android.os()).isEqualTo("Android");
        assertThat(android.device()).isEqualTo("Mobile");
        assertThat(android.bot()).isFalse();

        var iphone = UserAgentParser.parse("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1");
        assertThat(iphone.browser()).isEqualTo("Mobile Safari");
        assertThat(iphone.os()).isEqualTo("iOS");

        var edge = UserAgentParser.parse("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0");
        assertThat(edge.browser()).isEqualTo("Edge");
        assertThat(edge.device()).isEqualTo("Desktop");

        var samsung = UserAgentParser.parse("Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/24.0 Chrome/117.0.0.0 Mobile Safari/537.36");
        assertThat(samsung.browser()).isEqualTo("Samsung Internet");

        var fb = UserAgentParser.parse("facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)");
        assertThat(fb.bot()).isTrue();
        assertThat(fb.browser()).isEqualTo("FacebookBot");

        assertThat(UserAgentParser.parse(null).bot()).isTrue();
    }
}
