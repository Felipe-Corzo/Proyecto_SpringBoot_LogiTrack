package com.logitrack.repository;

import com.logitrack.model.MovimientoInventario;
import com.logitrack.model.TipoMovimiento;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface MovimientoInventarioRepository extends JpaRepository<MovimientoInventario, Long> {

    // Consulta 2: movimientos por rango de fechas
    List<MovimientoInventario> findByFechaBetween(LocalDateTime desde, LocalDateTime hasta);

    List<MovimientoInventario> findByUsuarioId(Long usuarioId);

    List<MovimientoInventario> findByTipoMovimiento(TipoMovimiento tipo);

    List<MovimientoInventario> findByBodegaOrigenIdOrBodegaDestinoId(Long bodegaOrigenId, Long bodegaDestinoId);
}
