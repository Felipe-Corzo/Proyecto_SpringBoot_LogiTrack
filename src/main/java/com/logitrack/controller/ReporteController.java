package com.logitrack.controller;

import com.logitrack.dto.ReporteResumenDTO;
import com.logitrack.repository.InventarioBodegaRepository;
import com.logitrack.repository.MovimientoDetalleRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reportes")
public class ReporteController {

    private final InventarioBodegaRepository inventarioBodegaRepository;
    private final MovimientoDetalleRepository movimientoDetalleRepository;

    public ReporteController(InventarioBodegaRepository inventarioBodegaRepository,
                              MovimientoDetalleRepository movimientoDetalleRepository) {
        this.inventarioBodegaRepository = inventarioBodegaRepository;
        this.movimientoDetalleRepository = movimientoDetalleRepository;
    }

    // Usado por el Dashboard: grafico de stock por bodega + top 5 mas movidos
    @GetMapping("/resumen")
    public ReporteResumenDTO resumenGeneral() {
        var stock = inventarioBodegaRepository.reporteStockPorBodega();
        var masMovidos = movimientoDetalleRepository.reporteProductosMasMovidos(PageRequest.of(0, 5));
        return new ReporteResumenDTO(stock, masMovidos);
    }
}