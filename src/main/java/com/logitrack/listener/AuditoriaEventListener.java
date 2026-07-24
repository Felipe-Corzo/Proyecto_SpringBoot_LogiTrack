package com.logitrack.listener;

import com.logitrack.model.Auditoria;
import com.logitrack.model.Usuario;
import com.logitrack.repository.AuditoriaRepository;
import com.logitrack.repository.UsuarioRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.LocalDateTime;

@Component
public class AuditoriaEventListener {

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
        } catch (Exception e) {
            // Silencioso: un fallo al auditar no debe tumbar la operación de negocio.
        }
    }
}