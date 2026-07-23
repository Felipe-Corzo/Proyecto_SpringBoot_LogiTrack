package com.logitrack.service;

import com.logitrack.dto.ProductoMovidoDTO;
import com.logitrack.dto.ResumenReporteDTO;
import com.logitrack.dto.StockPorBodegaDTO;
import com.logitrack.model.Bodega;
import com.logitrack.model.MovimientoDetalle;
import com.logitrack.model.MovimientoInventario;
import com.logitrack.model.Producto;
import com.logitrack.model.TipoMovimiento;
import com.logitrack.repository.BodegaRepository;
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

    public ReporteServiceImpl(BodegaRepository bodegaRepository,
                               ProductoRepository productoRepository,
                               MovimientoInventarioRepository movimientoRepository) {
        this.bodegaRepository = bodegaRepository;
        this.productoRepository = productoRepository;
        this.movimientoRepository = movimientoRepository;
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
        List<MovimientoInventario> movimientosParaStock = !movimientosRecientes.isEmpty()
                ? movimientosRecientes
                : movimientoRepository.findAll();

        Map<Long, StockPorBodegaDTO> stockPorBodegaMap = bodegaRepository.findAll().stream()
                .collect(Collectors.toMap(Bodega::getId,
                        b -> StockPorBodegaDTO.builder()
                                .bodegaNombre(b.getNombre())
                                .stockTotal(0L)
                                .build()));

        for (MovimientoInventario movimiento : movimientosParaStock) {
            if (movimiento.getDetalles() == null) continue;

            for (MovimientoDetalle detalle : movimiento.getDetalles()) {
                if (movimiento.getBodegaOrigen() != null && (movimiento.getTipoMovimiento() == TipoMovimiento.SALIDA || movimiento.getTipoMovimiento() == TipoMovimiento.TRANSFERENCIA)) {
                    StockPorBodegaDTO origen = stockPorBodegaMap.get(movimiento.getBodegaOrigen().getId());
                    if (origen != null) {
                        origen.setStockTotal(origen.getStockTotal() - detalle.getCantidad());
                    }
                }
                if (movimiento.getBodegaDestino() != null && (movimiento.getTipoMovimiento() == TipoMovimiento.ENTRADA || movimiento.getTipoMovimiento() == TipoMovimiento.TRANSFERENCIA)) {
                    StockPorBodegaDTO destino = stockPorBodegaMap.get(movimiento.getBodegaDestino().getId());
                    if (destino != null) {
                        destino.setStockTotal(destino.getStockTotal() + detalle.getCantidad());
                    }
                }
            }
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
