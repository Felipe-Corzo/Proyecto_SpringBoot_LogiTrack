package com.logitrack.controller;

import com.logitrack.model.Bodega;
import com.logitrack.service.BodegaService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bodegas")
public class BodegaController {

    private final BodegaService bodegaService;

    public BodegaController(BodegaService bodegaService) {
        this.bodegaService = bodegaService;
    }

    @GetMapping
    public List<Bodega> listar() {
        return bodegaService.obtenerTodas();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Bodega> obtenerPorId(@PathVariable Long id) {
        return bodegaService.obtenerPorId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Bodega> crear(@Valid @RequestBody Bodega bodega) {
        Bodega creada = bodegaService.crear(bodega);
        return ResponseEntity.status(201).body(creada);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Bodega> actualizar(@PathVariable Long id,
                                              @Valid @RequestBody Bodega datos) {
        return bodegaService.actualizar(id, datos)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        boolean eliminado = bodegaService.eliminar(id);
        return eliminado ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }
}
