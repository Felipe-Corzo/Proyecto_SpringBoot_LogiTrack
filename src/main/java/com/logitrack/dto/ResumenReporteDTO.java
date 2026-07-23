package com.logitrack.dto;

import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResumenReporteDTO {

    private long totalBodegas;
    private long totalProductos;
    private long productosBajoStock;
    private long totalMovimientosMes;
    private BigDecimal valorTotalInventario;
}
