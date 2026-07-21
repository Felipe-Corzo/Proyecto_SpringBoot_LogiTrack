package com.logitrack.exception;

/**
 * Excepcion temporal. En el paso 8 (@ControllerAdvice) la vamos a
 * capturar globalmente para devolver un JSON de error 404 consistente.
 * Por ahora los controllers manejan el caso "no encontrado" con Optional.
 */
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String mensaje) {
        super(mensaje);
    }
}
