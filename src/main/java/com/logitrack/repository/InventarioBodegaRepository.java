package com.logitrack.repository;

import com.logitrack.model.InventarioBodega;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InventarioBodegaRepository extends JpaRepository<InventarioBodega, Long> {

    List<InventarioBodega> findByProductoId(Long productoId);

    List<InventarioBodega> findByBodegaId(Long bodegaId);

    Optional<InventarioBodega> findByProductoIdAndBodegaId(Long productoId, Long bodegaId);

    @Query("SELECT COALESCE(SUM(inv.stock), 0) FROM InventarioBodega inv WHERE inv.producto.id = :productoId")
    Integer sumStockByProductoId(@Param("productoId") Long productoId);

    @Query("SELECT COALESCE(SUM(inv.stock), 0) FROM InventarioBodega inv WHERE inv.bodega.id = :bodegaId")
    Integer sumStockByBodegaId(@Param("bodegaId") Long bodegaId);

    List<InventarioBodega> findByProductoIdIn(List<Long> productoIds);
}

