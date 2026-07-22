package com.logitrack.config;

import com.logitrack.audit.UsuarioActualProvider;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * TEMPORAL: mientras no exista Spring Security + JWT (paso 6), este filtro
 * permite probar la auditoria "con usuario" leyendo un header simple:
 *
 *   X-Usuario-Id: 2
 *
 * En el paso 6 este filtro se REEMPLAZA por el filtro JWT real, que sacara
 * el id del usuario del token validado en vez de un header sin proteccion
 * (tal cual esta ahora, cualquiera podria poner el id que quiera).
 */
public class UsuarioActualFilter extends OncePerRequestFilter {

    private static final String HEADER = "X-Usuario-Id";

    private final UsuarioActualProvider usuarioActualProvider;

    public UsuarioActualFilter(UsuarioActualProvider usuarioActualProvider) {
        this.usuarioActualProvider = usuarioActualProvider;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain) throws ServletException, IOException {
        try {
            String valor = request.getHeader(HEADER);
            if (valor != null && !valor.isBlank()) {
                usuarioActualProvider.setUsuarioActual(Long.parseLong(valor));
            }
            filterChain.doFilter(request, response);
        } finally {
            usuarioActualProvider.limpiar();
        }
    }
}
