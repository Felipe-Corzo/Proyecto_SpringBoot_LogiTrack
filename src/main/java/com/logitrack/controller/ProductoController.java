package com.logitrack.controller;

import com.logitrack.dto.ProductoConInventarioDTO;
import com.logitrack.model.Producto;
import com.logitrack.service.ProductoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/productos")
public class ProductoController {

    private final ProductoService productoService;

    public ProductoController(ProductoService productoService) {
        this.productoService = productoService;
    }

    @GetMapping
    public ResponseEntity<List<Producto>> obtenerTodos(
            @RequestParam(required = false) String nombre,
            @RequestParam(required = false) String categoria,
            @RequestParam(required = false) Boolean bajoStock) {
        if (nombre != null || categoria != null || bajoStock != null) {
            return ResponseEntity.ok(productoService.filtrarProductos(nombre, categoria, bajoStock));
        }
        return ResponseEntity.ok(productoService.obtenerTodos());
    }

    @GetMapping("/con-inventario")
    public ResponseEntity<List<ProductoConInventarioDTO>> obtenerTodosConInventario() {
        return ResponseEntity.ok(productoService.obtenerTodosConInventario());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Producto> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(productoService.obtenerPorId(id));
    }

    @GetMapping("/{id}/con-inventario")
    public ResponseEntity<ProductoConInventarioDTO> obtenerConInventarioPorId(@PathVariable Long id) {
        return ResponseEntity.ok(productoService.obtenerConInventarioPorId(id));
    }

    @GetMapping("/bajo-stock")
    public ResponseEntity<List<Producto>> obtenerBajoStock(@RequestParam(defaultValue = "10") Integer umbral) {
        return ResponseEntity.ok(productoService.buscarBajoStock(umbral));
    }

    @PostMapping
    public ResponseEntity<Producto> crear(@Valid @RequestBody Producto producto) {
        return new ResponseEntity<>(productoService.guardar(producto), HttpStatus.CREATED);
    }

    @PostMapping("/con-inventario")
    public ResponseEntity<Producto> crearConInventario(@Valid @RequestBody ProductoRequest request) {
        return new ResponseEntity<>(
            productoService.guardarConInventario(request.producto(), request.stockPorBodega()),
            HttpStatus.CREATED
        );
    }

    @PutMapping("/{id}")
    public ResponseEntity<Producto> actualizar(@PathVariable Long id, @Valid @RequestBody Producto producto) {
        return ResponseEntity.ok(productoService.actualizar(id, producto));
    }

    @PutMapping("/{id}/con-inventario")
    public ResponseEntity<Producto> actualizarConInventario(@PathVariable Long id, @Valid @RequestBody ProductoRequest request) {
        return ResponseEntity.ok(
            productoService.actualizarConInventario(id, request.producto(), request.stockPorBodega())
        );
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        productoService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}

record ProductoRequest(Producto producto, Map<Long, Integer> stockPorBodega) {}
