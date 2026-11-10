package com.kiungo.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI kiungoOpenApi() {
        return new OpenAPI()
            .info(new Info()
                .title("Kiungo API")
                .version("v1")
                .description("""
                    Create and manage short links, read analytics and integrate Kiungo into your apps.

                    **Authentication** — send either:
                    * `X-API-Key: kk_live_...` (create keys in the dashboard under *Integrations & API*), or
                    * `Authorization: Bearer <jwt>` (what the dashboard itself uses).

                    Rate limits depend on your plan and are reported in `X-RateLimit-*` headers.
                    """))
            .components(new Components()
                .addSecuritySchemes("apiKey", new SecurityScheme()
                    .type(SecurityScheme.Type.APIKEY).in(SecurityScheme.In.HEADER).name("X-API-Key"))
                .addSecuritySchemes("bearer", new SecurityScheme()
                    .type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")))
            .addSecurityItem(new SecurityRequirement().addList("apiKey"))
            .addSecurityItem(new SecurityRequirement().addList("bearer"));
    }
}
