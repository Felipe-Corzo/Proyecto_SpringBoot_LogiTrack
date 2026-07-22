package com.logitrack.audit;

import org.springframework.stereotype.Component;

/**
 * Da acceso al id del usuario que esta ejecutando la operacion HTTP actual.
 *
 * Por ahora nadie lo llena todavia porque no existe login real (eso es el
 * paso 6: Spring Security + JWT). Cuando lo implementemos, un filtro va a
 * llamar setUsuarioActual(id) al validar el token al inicio del request, y
 * limpiar() al final. Mientras tanto, obtenerUsuarioActualId() devuelve
 * null y la auditoria queda registrada sin usuario (columna usuario_id NULL,
 * lo cual la tabla ya permite).
 */
@Component
public class UsuarioActualProvider {

    private static final ThreadLocal<Long> USUARIO_ACTUAL = new ThreadLocal<>();

    public void setUsuarioActual(Long usuarioId) {
        USUARIO_ACTUAL.set(usuarioId);
    }

    public Long obtenerUsuarioActualId() {
        return USUARIO_ACTUAL.get();
    }

    public void limpiar() {
        USUARIO_ACTUAL.remove();
    }
}
