package com.logitrack.dto;

/**
 * Proyeccion para el reporte "stock total por bodega".
 * Se llena via JPQL con constructor expression (ver InventarioBodegaRepository).
 */
public record StockPorBodegaDTO(
        Long bodegaId,
        String bodegaNombre,
        Long stockTotal
) {}
