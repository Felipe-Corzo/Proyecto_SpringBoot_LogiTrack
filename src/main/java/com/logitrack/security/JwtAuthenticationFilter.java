package com.logitrack.security;

import com.logitrack.audit.UsuarioActualProvider;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UsuarioActualProvider usuarioActualProvider;

    public JwtAuthenticationFilter(JwtUtil jwtUtil, UsuarioActualProvider usuarioActualProvider) {
        this.jwtUtil = jwtUtil;
        this.usuarioActualProvider = usuarioActualProvider;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain) throws ServletException, IOException {
        try {
            String header = request.getHeader("Authorization");

            if (header != null && header.startsWith("Bearer ")) {
                String token = header.substring(7);

                if (jwtUtil.esTokenValido(token)) {
                    String username = jwtUtil.extraerUsername(token);
                    Long usuarioId = jwtUtil.extraerUsuarioId(token);
                    String rol = jwtUtil.extraerRol(token);

                    var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + rol));
                    var authentication = new UsernamePasswordAuthenticationToken(username, null, authorities);
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authentication);

                    // Reemplaza al viejo header "X-Usuario-Id": ahora el usuario
                    // que queda registrado en la Auditoria es el del token real.
                    usuarioActualProvider.setUsuarioActual(usuarioId);
                }
            }
            filterChain.doFilter(request, response);
        } finally {
            usuarioActualProvider.limpiar();
        }
    }
}
