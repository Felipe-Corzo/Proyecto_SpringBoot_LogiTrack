package com.logitrack.config;

import com.logitrack.audit.UsuarioActualProvider;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class WebConfig {

    @Bean
    public FilterRegistrationBean<UsuarioActualFilter> usuarioActualFilter(UsuarioActualProvider provider) {
        FilterRegistrationBean<UsuarioActualFilter> registro = new FilterRegistrationBean<>();
        registro.setFilter(new UsuarioActualFilter(provider));
        registro.addUrlPatterns("/api/*");
        registro.setOrder(1);
        return registro;
    }
}
