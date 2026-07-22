package com.logitrack.repository;

import com.logitrack.dto.StockPorBodegaDTO;
import com.logitrack.model.InventarioBodega;
import com.logitrack.model.InventarioBodegaId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface InventarioBodegaRepository extends JpaRepository<InventarioBodega, InventarioBodegaId> {

    List<InventarioBodega> findByBodegaId(Long bodegaId);

    Optional<InventarioBodega> findByBodegaIdAndProductoId(Long bodegaId, Long productoId);

    // Reporte: stock total por bodega
    @Query("""
           SELECT new com.logitrack.dto.StockPorBodegaDTO(
                   ib.bodega.id, ib.bodega.nombre, SUM(ib.cantidad))
           FROM InventarioBodega ib
           GROUP BY ib.bodega.id, ib.bodega.nombre
           """)
    List<StockPorBodegaDTO> reporteStockPorBodega();
}
