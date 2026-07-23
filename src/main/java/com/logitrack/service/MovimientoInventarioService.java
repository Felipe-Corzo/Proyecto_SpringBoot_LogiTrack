package com.logitrack.service;

import com.logitrack.model.MovimientoInventario;
import com.logitrack.model.TipoMovimiento;

import java.time.LocalDateTime;
import java.util.List;

public interface MovimientoInventarioService {

    List<MovimientoInventario> obtenerTodos();

    MovimientoInventario obtenerPorId(Long id);

    MovimientoInventario registrarMovimiento(MovimientoInventario movimiento);

    List<MovimientoInventario> buscarPorTipo(TipoMovimiento tipo);

    List<MovimientoInventario> buscarPorRangoFechas(LocalDateTime desde, LocalDateTime hasta);

    List<MovimientoInventario> buscarPorBodega(Long bodegaId);
}
