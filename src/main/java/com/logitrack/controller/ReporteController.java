package com.logitrack.controller;

import com.logitrack.dto.ResumenReporteDTO;
import com.logitrack.service.ReporteService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reportes")
public class ReporteController {

    private final ReporteService reporteService;

    public ReporteController(ReporteService reporteService) {
        this.reporteService = reporteService;
    }

    @GetMapping("/resumen")
    public ResponseEntity<ResumenReporteDTO> obtenerResumenGeneral(
            @RequestParam(value = "dias", required = false, defaultValue = "30") Integer dias,
            @RequestParam(value = "limit", required = false, defaultValue = "20") Integer limit) {
        return ResponseEntity.ok(reporteService.obtenerResumenGeneral(dias, limit));
    }
}
