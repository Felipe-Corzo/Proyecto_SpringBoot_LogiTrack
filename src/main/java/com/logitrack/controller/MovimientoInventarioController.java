package com.logitrack.controller;

import com.logitrack.model.MovimientoInventario;
import com.logitrack.model.TipoMovimiento;
import com.logitrack.service.MovimientoInventarioService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
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
    public ResponseEntity<List<MovimientoInventario>> obtenerTodos() {
        return ResponseEntity.ok(movimientoService.obtenerTodos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MovimientoInventario> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(movimientoService.obtenerPorId(id));
    }

    @GetMapping("/tipo/{tipo}")
    public ResponseEntity<List<MovimientoInventario>> buscarPorTipo(@PathVariable TipoMovimiento tipo) {
        return ResponseEntity.ok(movimientoService.buscarPorTipo(tipo));
    }

    @GetMapping("/rango")
    public ResponseEntity<List<MovimientoInventario>> buscarPorRangoFechas(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime hasta) {
        return ResponseEntity.ok(movimientoService.buscarPorRangoFechas(desde, hasta));
    }

    @GetMapping("/bodega/{bodegaId}")
    public ResponseEntity<List<MovimientoInventario>> buscarPorBodega(@PathVariable Long bodegaId) {
        return ResponseEntity.ok(movimientoService.buscarPorBodega(bodegaId));
    }

    @PostMapping
    public ResponseEntity<MovimientoInventario> registrar(@Valid @RequestBody MovimientoInventario movimiento) {
        return new ResponseEntity<>(movimientoService.registrarMovimiento(movimiento), HttpStatus.CREATED);
    }
}
