package com.logitrack.service;

import com.logitrack.dto.ProductoMovidoDTO;
import com.logitrack.dto.ResumenReporteDTO;
import com.logitrack.dto.StockPorBodegaDTO;
import com.logitrack.model.Bodega;
import com.logitrack.model.MovimientoDetalle;
import com.logitrack.model.MovimientoInventario;
import com.logitrack.model.Producto;
import com.logitrack.repository.BodegaRepository;
import com.logitrack.repository.InventarioBodegaRepository;
import com.logitrack.repository.MovimientoInventarioRepository;
import com.logitrack.repository.ProductoRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ReporteServiceImpl implements ReporteService {

    private final BodegaRepository bodegaRepository;
    private final ProductoRepository productoRepository;
    private final MovimientoInventarioRepository movimientoRepository;
    private final InventarioBodegaRepository inventarioBodegaRepository;

    public ReporteServiceImpl(BodegaRepository bodegaRepository,
                               ProductoRepository productoRepository,
                               MovimientoInventarioRepository movimientoRepository,
                               InventarioBodegaRepository inventarioBodegaRepository) {
        this.bodegaRepository = bodegaRepository;
        this.productoRepository = productoRepository;
        this.movimientoRepository = movimientoRepository;
        this.inventarioBodegaRepository = inventarioBodegaRepository;
    }

    @Override
    public ResumenReporteDTO obtenerResumenGeneral() {
        return obtenerResumenGeneral(30, 20);
    }

    @Override
    public ResumenReporteDTO obtenerResumenGeneral(Integer dias, Integer limit) {
        long totalBodegas = bodegaRepository.count();
        List<Producto> productos = productoRepository.findAll();
        long totalProductos = productos.size();

        long productosBajoStock = productos.stream()
                .filter(p -> p.getStock() != null && p.getStock() < 10)
                .count();

        BigDecimal valorTotalInventario = productos.stream()
                .filter(p -> p.getStock() != null && p.getPrecio() != null)
                .map(p -> p.getPrecio().multiply(BigDecimal.valueOf(p.getStock())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        int periodoDias = dias != null && dias > 0 ? dias : 30;
        int topLimit = limit != null && limit > 0 ? limit : 20;
        LocalDateTime fechaHasta = LocalDateTime.now();
        LocalDateTime fechaDesde = fechaHasta.minusDays(periodoDias);
        List<MovimientoInventario> movimientosRecientes = movimientoRepository.findByFechaBetween(fechaDesde, fechaHasta);

        // Obtener stock real desde inventario_bodega
        List<Bodega> bodegas = bodegaRepository.findAll();
        Map<Long, StockPorBodegaDTO> stockPorBodegaMap = new HashMap<>();

        for (Bodega bodega : bodegas) {
            Integer stockTotal = inventarioBodegaRepository.sumStockByBodegaId(bodega.getId());
            stockPorBodegaMap.put(bodega.getId(), StockPorBodegaDTO.builder()
                    .bodegaId(bodega.getId())
                    .bodegaNombre(bodega.getNombre())
                    .stockTotal(stockTotal != null ? stockTotal.longValue() : 0L)
                    .build());
        }

        Map<Long, ProductoMovidoDTO> movimientosPorProducto = new HashMap<>();
        for (MovimientoInventario movimiento : movimientosRecientes) {
            if (movimiento.getDetalles() == null) continue;
            for (MovimientoDetalle detalle : movimiento.getDetalles()) {
                if (detalle.getProducto() == null || detalle.getProducto().getId() == null) continue;
                movimientosPorProducto.compute(detalle.getProducto().getId(), (id, dto) -> {
                    long total = detalle.getCantidad();
                    if (dto == null) {
                        return ProductoMovidoDTO.builder()
                                .nombre(detalle.getProducto().getNombre())
                                .totalMovido(total)
                                .build();
                    }
                    dto.setTotalMovido(dto.getTotalMovido() + total);
                    return dto;
                });
            }
        }

        List<StockPorBodegaDTO> stockPorBodega = stockPorBodegaMap.values().stream()
                .sorted((a, b) -> Long.compare(b.getStockTotal(), a.getStockTotal()))
                .collect(Collectors.toList());

        List<ProductoMovidoDTO> productosMasMovidos = movimientosPorProducto.values().stream()
                .sorted((a, b) -> Long.compare(b.getTotalMovido(), a.getTotalMovido()))
                .limit(topLimit)
                .collect(Collectors.toList());

        return ResumenReporteDTO.builder()
                .totalBodegas(totalBodegas)
                .totalProductos(totalProductos)
                .productosBajoStock(productosBajoStock)
                .totalMovimientosMes(movimientosRecientes.size())
                .valorTotalInventario(valorTotalInventario)
                .stockPorBodega(stockPorBodega)
                .productosMasMovidos(productosMasMovidos)
                .build();
    }
}
