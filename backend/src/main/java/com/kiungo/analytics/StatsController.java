package com.kiungo.analytics;

import com.kiungo.analytics.StatsDtos.ClickEventView;
import com.kiungo.analytics.StatsDtos.StatsResponse;
import com.kiungo.auth.AuthUser;
import com.kiungo.link.LinkDtos.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/stats")
@Tag(name = "Analytics", description = "Click statistics and the live click stream")
public class StatsController {

    private final StatsService stats;

    public StatsController(StatsService stats) {
        this.stats = stats;
    }

    @GetMapping
    @Operation(summary = "Aggregated statistics",
        description = "Account-wide, or for a single link with `linkId`. `days` is capped by your plan's analytics retention. "
            + "`tz` is an IANA zone such as Africa/Nairobi, used for the daily series.")
    public StatsResponse get(@RequestParam(defaultValue = "30") int days,
                             @RequestParam(required = false) Long linkId,
                             @RequestParam(required = false) String tz,
                             @RequestParam(defaultValue = "false") boolean humanOnly) {
        return stats.stats(AuthUser.current().id(), days, linkId, tz, humanOnly);
    }

    @GetMapping("/clicks")
    @Operation(summary = "Recent individual clicks (newest first)")
    public PageResponse<ClickEventView> clicks(@RequestParam(required = false) Long linkId,
                                               @RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "50") int size) {
        return stats.stream(AuthUser.current().id(), linkId, page, size);
    }
}
