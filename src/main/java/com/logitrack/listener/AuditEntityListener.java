package com.logitrack.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.logitrack.config.SpringContext;
import com.logitrack.config.UserContext;
import com.logitrack.model.Auditoria;
import com.logitrack.model.TipoOperacion;
import jakarta.persistence.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.lang.reflect.Field;
import java.util.IdentityHashMap;
import java.util.Map;

public class AuditEntityListener {

    private static final Logger log = LoggerFactory.getLogger(AuditEntityListener.class);

    // Creado a mano (no inyectado por Spring) para evitar el problema de orden
    // de arranque: Hibernate instancia este listener ANTES de que Spring termine
    // de registrar el bean ObjectMapper. Le agregamos JavaTimeModule manualmente
    // para que serialice bien los LocalDateTime.
    private static final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    private static final ThreadLocal<Map<Object, String>> snapshots =
            ThreadLocal.withInitial(IdentityHashMap::new);

    @PostLoad
    public void onPostLoad(Object entity) {
        if (entity instanceof Auditoria) return;
        snapshots.get().put(entity, serializar(entity));
    }

    @PostPersist
    public void onPostPersist(Object entity) {
        publicarEvento(TipoOperacion.INSERT, entity, null, serializar(entity));
    }

    @PostUpdate
    public void onPostUpdate(Object entity) {
        String anterior = snapshots.get().remove(entity);
        publicarEvento(TipoOperacion.UPDATE, entity, anterior, serializar(entity));
    }

    @PostRemove
    public void onPostRemove(Object entity) {
        String anterior = snapshots.get().remove(entity);
        publicarEvento(TipoOperacion.DELETE, entity, anterior != null ? anterior : serializar(entity), null);
    }

    private void publicarEvento(TipoOperacion tipo, Object entity, String valoresAnteriores, String valoresNuevos) {
        if (entity instanceof Auditoria) {
            return;
        }

        try {
            // Obtener el ApplicationEventPublisher desde SpringContext,
            // ya que Hibernate instancia este listener fuera del contenedor de Spring.
            ApplicationEventPublisher eventPublisher = SpringContext.getBean(ApplicationEventPublisher.class);
            if (eventPublisher == null) {
                log.warn("AuditEntityListener: ApplicationEventPublisher no disponible aún (Spring inicializando). " +
                        "Entidad: {}, Operación: {}", entity.getClass().getSimpleName(), tipo);
                return;
            }

            Long entidadId = obtenerIdEntidad(entity);
            String username = obtenerUsernameAutenticado();
            eventPublisher.publishEvent(new AuditoriaEvent(
                    tipo, entity.getClass().getSimpleName(), entidadId, valoresAnteriores, valoresNuevos, username));
        } catch (Exception e) {
            log.error("AuditEntityListener: Error al publicar evento de auditoría para entidad {} - {}: {}",
                    entity.getClass().getSimpleName(), tipo, e.getMessage(), e);
        }
    }

    private String obtenerUsernameAutenticado() {
        // 1. Intentar obtener el usuario desde UserContext (ThreadLocal).
        //    JwtAuthenticationFilter lo establece al inicio del request,
        //    por lo que está disponible incluso en listeners JPA que
        //    se ejecutan en el mismo hilo de la petición HTTP.
        String usernameFromContext = UserContext.getUsername();
        if (usernameFromContext != null) {
            return usernameFromContext;
        }

        // 2. Fallback: SecurityContextHolder (puede no estar disponible
        //    si el listener se ejecuta fuera del hilo de la petición).
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.isAuthenticated()
                    && !"anonymousUser".equals(authentication.getPrincipal())) {
                return authentication.getName();
            }
        } catch (Exception e) {
            log.debug("AuditEntityListener: No se pudo obtener el usuario de SecurityContextHolder", e);
        }

        return null;
    }

    private Long obtenerIdEntidad(Object entity) {
        try {
            Field idField = entity.getClass().getDeclaredField("id");
            idField.setAccessible(true);
            Object id = idField.get(entity);
            return id != null ? Long.parseLong(id.toString()) : null;
        } catch (Exception e) {
            return null;
        }
    }

    private String serializar(Object entity) {
        try {
            return objectMapper.writeValueAsString(entity);
        } catch (Exception e) {
            return entity.toString();
        }
    }
}
