package com.logitrack.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.logitrack.model.Auditoria;
import com.logitrack.model.TipoOperacion;
import jakarta.persistence.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.lang.reflect.Field;

@Component
public class AuditEntityListener {

    // Ya NO se inyecta ningún Repository aquí: el listener no debe escribir en la BD.
    private static ApplicationEventPublisher eventPublisher;
    private static final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    public void init(ApplicationEventPublisher publisher) {
        AuditEntityListener.eventPublisher = publisher;
    }

    @PostPersist
    public void onPostPersist(Object entity) {
        publicarEvento(TipoOperacion.INSERT, entity, null, serializar(entity));
    }

    @PostUpdate
    public void onPostUpdate(Object entity) {
        publicarEvento(TipoOperacion.UPDATE, entity, null, serializar(entity));
    }

    @PostRemove
    public void onPostRemove(Object entity) {
        publicarEvento(TipoOperacion.DELETE, entity, serializar(entity), null);
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
            // Silencioso para no romper la transacción de la entidad principal
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