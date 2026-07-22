package com.logitrack.repository;

import com.logitrack.model.Auditoria;
import com.logitrack.model.TipoOperacion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditoriaRepository extends JpaRepository<Auditoria, Long> {

    // Consulta 3: auditorias por usuario
    List<Auditoria> findByUsuarioId(Long usuarioId);

    // Consulta 4: auditorias por tipo de operacion
    List<Auditoria> findByTipoOperacion(TipoOperacion tipoOperacion);

    List<Auditoria> findByEntidadAfectada(String entidadAfectada);
}
