package com.logitrack.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.logitrack.model.Auditoria;
import com.logitrack.model.TipoOperacion;
import jakarta.persistence.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.lang.reflect.Field;
import java.util.IdentityHashMap;
import java.util.Map;

@Component
public class AuditEntityListener {

    private static ApplicationEventPublisher eventPublisher;

    // Creado a mano (no inyectado por Spring) para evitar el problema de orden
    // de arranque: Hibernate instancia este listener ANTES de que Spring termine
    // de registrar el bean ObjectMapper. Le agregamos JavaTimeModule manualmente
    // para que serialice bien los LocalDateTime.
    private static final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    private static final ThreadLocal<Map<Object, String>> snapshots =
            ThreadLocal.withInitial(IdentityHashMap::new);

    @Autowired
    public void init(ApplicationEventPublisher publisher) {
        AuditEntityListener.eventPublisher = publisher;
    }

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
        if (eventPublisher == null || entity instanceof Auditoria) {
            return;
        }
        try {
            Long entidadId = obtenerIdEntidad(entity);
            String username = obtenerUsernameAutenticado();
            eventPublisher.publishEvent(new AuditoriaEvent(
                    tipo, entity.getClass().getSimpleName(), entidadId, valoresAnteriores, valoresNuevos, username));
        } catch (Exception e) {
            e.printStackTrace(); // TEMPORAL: para ver en consola si algo falla aquí (revertir después)
        }
    }

    private String obtenerUsernameAutenticado() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.isAuthenticated()
                    && !"anonymousUser".equals(authentication.getPrincipal())) {
                return authentication.getName();
            }
        } catch (Exception e) {
            // Silencioso
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