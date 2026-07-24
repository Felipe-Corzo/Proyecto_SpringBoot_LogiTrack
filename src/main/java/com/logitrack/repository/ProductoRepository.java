package com.logitrack.repository;

import com.logitrack.model.Producto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;


import java.util.List;


public interface ProductoRepository extends JpaRepository<Producto, Long> {

    List<Producto> findByNombreContainingIgnoreCase(String nombre);

    List<Producto> findByCategoriaIgnoreCase(String categoria);

    List<Producto> findByStockLessThan(Integer umbralStock);

    @Query("SELECT p FROM Producto p WHERE (:nombre IS NULL OR LOWER(p.nombre) LIKE LOWER(CONCAT('%', :nombre, '%'))) " +
           "AND (:categoria IS NULL OR LOWER(p.categoria) = LOWER(:categoria)) " +
           "AND (:bajoStock IS NULL OR (:bajoStock = true AND p.stock < 10) OR (:bajoStock = false))")
    List<Producto> filtrarProductos(String nombre, String categoria, Boolean bajoStock);
}
