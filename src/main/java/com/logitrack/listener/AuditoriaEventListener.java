package com.logitrack.listener;

import com.logitrack.model.Auditoria;
import com.logitrack.model.Usuario;
import com.logitrack.repository.AuditoriaRepository;
import com.logitrack.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.LocalDateTime;

@Component
public class AuditoriaEventListener {

    private static final Logger log = LoggerFactory.getLogger(AuditoriaEventListener.class);

    private final AuditoriaRepository auditoriaRepository;
    private final UsuarioRepository usuarioRepository;

    public AuditoriaEventListener(AuditoriaRepository auditoriaRepository, UsuarioRepository usuarioRepository) {
        this.auditoriaRepository = auditoriaRepository;
        this.usuarioRepository = usuarioRepository;
    }

    // Corre DESPUÉS del commit de la transacción original (movimiento, bodega, producto).
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onAuditoriaEvent(AuditoriaEvent event) {
        try {
            Usuario usuario = event.getUsername() != null
                    ? usuarioRepository.findByUsername(event.getUsername()).orElse(null)
                    : null;

            Auditoria audit = Auditoria.builder()
                    .tipoOperacion(event.getTipoOperacion())
                    .fechaHora(LocalDateTime.now())
                    .usuario(usuario)
                    .entidadAfectada(event.getEntidadAfectada())
                    .entidadId(event.getEntidadId())
                    .valoresAnteriores(event.getValoresAnteriores())
                    .valoresNuevos(event.getValoresNuevos())
                    .build();

            auditoriaRepository.save(audit);
            log.info("Auditoría guardada: {} en {} (id={})",
                    event.getTipoOperacion(), event.getEntidadAfectada(), event.getEntidadId());
        } catch (Exception e) {
            // No debe tumbar la operación de negocio, pero se loguea para diagnóstico
            log.error("AuditoriaEventListener: Error al guardar auditoría para {} {} (id={}): {}",
                    event.getTipoOperacion(), event.getEntidadAfectada(), event.getEntidadId(), e.getMessage(), e);
        }
    }
}
