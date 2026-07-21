package com.logitrack.dto;

/**
 * Proyeccion para el reporte "productos mas movidos".
 */
public record ProductoMasMovidoDTO(
        Long productoId,
        String nombre,
        Long totalMovido,
        Long numeroMovimientos
) {}
