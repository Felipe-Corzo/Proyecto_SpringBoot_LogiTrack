package com.logitrack.controller;

import com.logitrack.model.MovimientoInventario;
import com.logitrack.service.MovimientoInventarioService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/movimientos")
public class MovimientoInventarioController {

    private final MovimientoInventarioService movimientoService;

    public MovimientoInventarioController(MovimientoInventarioService movimientoService) {
        this.movimientoService = movimientoService;
    }

    @GetMapping
    public List<MovimientoInventario> listar() {
        return movimientoService.obtenerTodos();
    }

    @GetMapping("/{id}")
    public ResponseEntity<MovimientoInventario> obtenerPorId(@PathVariable Long id) {
        return movimientoService.obtenerPorId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<MovimientoInventario> crear(@Valid @RequestBody MovimientoInventario movimiento) {
        MovimientoInventario creado = movimientoService.crear(movimiento);
        return ResponseEntity.status(201).body(creado);
    }

    // Adelanto del paso 7: consulta por rango de fechas (BETWEEN)
    // Ejemplo: /api/movimientos/rango?desde=2026-07-01T00:00:00&hasta=2026-07-31T23:59:59
    @GetMapping("/rango")
    public List<MovimientoInventario> obtenerPorRango(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime hasta) {
        return movimientoService.obtenerPorRangoFechas(desde, hasta);
    }
}
