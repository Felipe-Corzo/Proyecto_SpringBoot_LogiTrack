package com.logitrack.audit;

import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.stereotype.Component;

/**
 * Los EntityListener de JPA (@PrePersist, @PreUpdate, etc.) los instancia
 * Hibernate, NO el contenedor de Spring, asi que no se les puede inyectar
 * un repository con @Autowired directamente. Este componente guarda una
 * referencia estatica al ApplicationContext para que el listener pueda
 * pedir los beans que necesite (AuditoriaRepository, UsuarioRepository, etc).
 */
@Component
public class SpringContextHolder implements ApplicationContextAware {

    private static ApplicationContext contexto;

    @Override
    public void setApplicationContext(ApplicationContext applicationContext) {
        SpringContextHolder.contexto = applicationContext;
    }

    public static <T> T getBean(Class<T> tipo) {
        if (contexto == null) {
            throw new IllegalStateException(
                    "El ApplicationContext de Spring aun no se ha inicializado");
        }
        return contexto.getBean(tipo);
    }
}
