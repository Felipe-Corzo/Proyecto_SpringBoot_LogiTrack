package com.logitrack.audit;


import com.logitrack.model.Auditoria;
import com.logitrack.model.TipoOperacion;
import com.logitrack.repository.AuditoriaRepository;
import com.logitrack.repository.UsuarioRepository;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreRemove;
import jakarta.persistence.PreUpdate;
import tools.jackson.databind.ObjectMapper;

import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Se engancha a cualquier entidad marcada con @EntityListeners(AuditListener.class)
 * y que implemente Auditable. Registra automaticamente cada INSERT/UPDATE/DELETE
 * en la tabla auditoria, sin que el service tenga que acordarse de hacerlo.
 */
public class AuditListener {

    @PostLoad
    public void onPostLoad(Object entity) {
        // Guardamos una "foto" de como estaba la entidad justo al leerla de la BD.
        // Sirve como "valores_anteriores" si mas adelante se actualiza.
        if (entity instanceof Auditable auditable) {
            auditable.setAuditSnapshot(serializar(auditable));
        }
    }

    @PrePersist
    public void onPrePersist(Object entity) {
        programarRegistro(entity, TipoOperacion.INSERT, null);
    }

    @PreUpdate
    public void onPreUpdate(Object entity) {
        if (entity instanceof Auditable auditable) {
            programarRegistro(entity, TipoOperacion.UPDATE, auditable.getAuditSnapshot());
        }
    }

    @PreRemove
    public void onPreRemove(Object entity) {
        if (entity instanceof Auditable auditable) {
            programarRegistro(entity, TipoOperacion.DELETE, auditable.getAuditSnapshot());
        }
    }

    /**
     * OJO: estamos parados en medio del flush de OTRA entidad (Bodega,
     * Producto...). Si aqui mismo hicieramos auditoriaRepository.save(...),
     * podriamos interferir con ese flush en curso. Por eso NO guardamos de
     * inmediato: registramos un TransactionSynchronization para que Spring
     * guarde la Auditoria justo despues de que la transaccion original haga
     * commit (afterCommit), cuando Hibernate ya termino su trabajo.
     */
    private void programarRegistro(Object entity, TipoOperacion tipo, String valoresAnteriores) {
        if (!(entity instanceof Auditable auditable)) {
            return;
        }

        String valoresNuevos = (tipo == TipoOperacion.DELETE) ? null : serializar(auditable);
        String entidadNombre = auditable.getEntidadNombre();
        String entidadId = String.valueOf(auditable.getAuditId());
        Long usuarioId = SpringContextHolder.getBean(UsuarioActualProvider.class).obtenerUsuarioActualId();

        Runnable guardarAuditoria = () -> {
            AuditoriaRepository auditoriaRepository = SpringContextHolder.getBean(AuditoriaRepository.class);
            UsuarioRepository usuarioRepository = SpringContextHolder.getBean(UsuarioRepository.class);

            Auditoria auditoria = Auditoria.builder()
                    .tipoOperacion(tipo)
                    .entidadAfectada(entidadNombre)
                    .entidadId(entidadId)
                    .valoresAnteriores(valoresAnteriores)
                    .valoresNuevos(valoresNuevos)
                    .build();

            if (usuarioId != null) {
                usuarioRepository.findById(usuarioId).ifPresent(auditoria::setUsuario);
            }

            auditoriaRepository.save(auditoria);
        };

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    guardarAuditoria.run();
                }
            });
        } else {
            // Caso raro sin transaccion activa: guardamos directo.
            guardarAuditoria.run();
        }
    }

    private String serializar(Auditable auditable) {
        try {
            return new ObjectMapper().writeValueAsString(auditable.auditFields());
        } catch (Exception e) {
            return "{\"error\":\"no se pudo serializar los campos\"}";
        }
    }
}
