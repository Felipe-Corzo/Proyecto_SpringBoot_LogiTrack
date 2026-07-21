package com.logitrack.repository;

import com.logitrack.dto.ProductoMasMovidoDTO;
import com.logitrack.model.MovimientoDetalle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface MovimientoDetalleRepository extends JpaRepository<MovimientoDetalle, Long> {

    List<MovimientoDetalle> findByProductoId(Long productoId);

    // Reporte: productos mas movidos (top N via Pageable, ej. PageRequest.of(0, 5))
    @Query("""
           SELECT new com.logitrack.dto.ProductoMasMovidoDTO(
                   p.id, p.nombre, SUM(md.cantidad), COUNT(DISTINCT md.movimiento.id))
           FROM MovimientoDetalle md
           JOIN md.producto p
           GROUP BY p.id, p.nombre
           ORDER BY SUM(md.cantidad) DESC
           """)
    List<ProductoMasMovidoDTO> reporteProductosMasMovidos(Pageable pageable);
}
