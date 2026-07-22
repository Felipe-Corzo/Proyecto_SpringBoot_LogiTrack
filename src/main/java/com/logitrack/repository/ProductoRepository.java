package com.logitrack.repository;

import com.logitrack.model.Producto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductoRepository extends JpaRepository<Producto, Long> {

    // Consulta 1: productos con stock bajo (< umbral, ej. 10)
    List<Producto> findByStockLessThan(Integer umbral);

    List<Producto> findByCategoriaIgnoreCase(String categoria);

    List<Producto> findByNombreContainingIgnoreCase(String nombre);
}
