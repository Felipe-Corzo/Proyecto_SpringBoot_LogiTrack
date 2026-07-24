package com.logitrack.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.logitrack.model.Auditoria;
import com.logitrack.model.TipoOperacion;
import com.logitrack.model.Usuario;
import com.logitrack.repository.AuditoriaRepository;
import com.logitrack.repository.UsuarioRepository;
import jakarta.persistence.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.lang.reflect.Field;
import java.time.LocalDateTime;

@Component
public class AuditEntityListener {

    private static AuditoriaRepository auditoriaRepository;
    private static UsuarioRepository usuarioRepository;
    private static final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    public void init(@Lazy AuditoriaRepository auditRepo, @Lazy UsuarioRepository userRepo) {
        AuditEntityListener.auditoriaRepository = auditRepo;
        AuditEntityListener.usuarioRepository = userRepo;
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
            Usuario usuario = obtenerUsuarioAutenticado();

            Auditoria audit = Auditoria.builder()
                    .tipoOperacion(tipo)
                    .fechaHora(LocalDateTime.now())
                    .usuario(usuario)
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

    /**
     * Obtiene el usuario autenticado desde el SecurityContextHolder.
     * Si no hay usuario autenticado, retorna null (se guarda como "Sistema" en frontend).
     */
    private Usuario obtenerUsuarioAutenticado() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.isAuthenticated()
                    && !"anonymousUser".equals(authentication.getPrincipal())) {
                String username = authentication.getName();
                if (username != null && usuarioRepository != null) {
                    return usuarioRepository.findByUsername(username).orElse(null);
                }
            }
        } catch (Exception e) {
            // Silencioso: si falla obtener el usuario, se registra sin él
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
