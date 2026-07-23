package com.logitrack.dto;

import java.util.List;

public record ReporteResumenDTO(
        List<StockPorBodegaDTO> stockPorBodega,
        List<ProductoMasMovidoDTO> productosMasMovidos
) {}
