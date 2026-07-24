package com.logitrack.config;

/**
 * Almacena el username del usuario autenticado en un ThreadLocal
 * para que esté disponible desde cualquier lugar (incluyendo
 * los listeners JPA que Hibernate instancia fuera del contenedor Spring).
 *
 * Se establece en JwtAuthenticationFilter después de validar el token JWT
 * y se limpia al finalizar el request.
 */
public class UserContext {

    private static final ThreadLocal<String> currentUser = new ThreadLocal<>();

    public static void setUsername(String username) {
        currentUser.set(username);
    }

    public static String getUsername() {
        return currentUser.get();
    }

    public static void clear() {
        currentUser.remove();
    }
}

