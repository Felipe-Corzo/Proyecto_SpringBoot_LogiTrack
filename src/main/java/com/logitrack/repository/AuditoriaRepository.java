package com.logitrack.repository;

import com.logitrack.model.Auditoria;
import com.logitrack.model.TipoOperacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditoriaRepository extends JpaRepository<Auditoria, Long> {

    List<Auditoria> findByEntidadAfectadaIgnoreCase(String entidadAfectada);

    List<Auditoria> findByTipoOperacion(TipoOperacion tipoOperacion);

    List<Auditoria> findByUsuario_Id(Long usuarioId);

    List<Auditoria> findAllByOrderByFechaHoraDesc();
}
