package com.logitrack.repository;

import com.logitrack.model.MovimientoInventario;
import com.logitrack.model.TipoMovimiento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;


import java.time.LocalDateTime;
import java.util.List;


public interface MovimientoInventarioRepository extends JpaRepository<MovimientoInventario, Long> {

    List<MovimientoInventario> findByTipoMovimiento(TipoMovimiento tipoMovimiento);

    List<MovimientoInventario> findByFechaBetween(LocalDateTime desde, LocalDateTime hasta);

    @Query("SELECT m FROM MovimientoInventario m WHERE m.bodegaOrigen.id = :bodegaId OR m.bodegaDestino.id = :bodegaId")
    List<MovimientoInventario> findByBodegaId(@Param("bodegaId") Long bodegaId);

    @Query("SELECT m FROM MovimientoInventario m ORDER BY m.fecha DESC")
    List<MovimientoInventario> findAllOrderByFechaDesc();
}
