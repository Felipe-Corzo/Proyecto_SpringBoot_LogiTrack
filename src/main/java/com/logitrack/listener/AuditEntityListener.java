package com.logitrack.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.logitrack.model.Auditoria;
import com.logitrack.model.TipoOperacion;
import com.logitrack.repository.AuditoriaRepository;
import jakarta.persistence.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

import java.lang.reflect.Field;
import java.time.LocalDateTime;

@Component
public class AuditEntityListener {

    private static AuditoriaRepository auditoriaRepository;
    private static final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    public void init(@Lazy AuditoriaRepository repository) {
        AuditEntityListener.auditoriaRepository = repository;
    }

    @PostPersist
    public void onPostPersist(Object entity) {
        registrarAuditoria(TipoOperacion.INSERT, entity, null, serializar(entity));
    }

    @PostUpdate
    public void onPostUpdate(Object entity) {
        registrarAuditoria(TipoOperacion.UPDATE, entity, null, serializar(entity));
    }

    @PostRemove
    public void onPostRemove(Object entity) {
        registrarAuditoria(TipoOperacion.DELETE, entity, serializar(entity), null);
    }

    private void registrarAuditoria(TipoOperacion tipo, Object entity, String valoresAnteriores, String valoresNuevos) {
        if (auditoriaRepository == null || entity instanceof Auditoria) {
            return;
        }

        try {
            Long entityId = obtenerIdEntidad(entity);
            Auditoria audit = Auditoria.builder()
                    .tipoOperacion(tipo)
                    .fechaHora(LocalDateTime.now())
                    .entidadAfectada(entity.getClass().getSimpleName())
                    .entidadId(entityId)
                    .valoresAnteriores(valoresAnteriores)
                    .valoresNuevos(valoresNuevos)
                    .build();

            auditoriaRepository.save(audit);
        } catch (Exception e) {
            // Silencioso para evitar romper transacciones de entidades primarias
        }
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
