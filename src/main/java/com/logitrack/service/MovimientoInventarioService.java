package com.logitrack.service;

import com.logitrack.model.MovimientoInventario;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface MovimientoInventarioService {

    List<MovimientoInventario> obtenerTodos();

    Optional<MovimientoInventario> obtenerPorId(Long id);

    /**
     * Registra el movimiento y actualiza inventario_bodega + productos.stock
     * segun el tipo (ENTRADA/SALIDA/TRANSFERENCIA). Todo dentro de una sola
     * transaccion: si algo falla (ej. stock insuficiente), no se guarda nada.
     */
    MovimientoInventario crear(MovimientoInventario movimiento);

    List<MovimientoInventario> obtenerPorRangoFechas(LocalDateTime desde, LocalDateTime hasta);

    // Nota: no exponemos actualizar/eliminar. Un movimiento ya registrado
    // es un hecho historico/auditable; si algo estuvo mal, se corrige con
    // un movimiento inverso, no editando el original.
}
