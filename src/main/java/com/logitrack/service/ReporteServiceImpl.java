package com.logitrack.service;

import com.logitrack.dto.ResumenReporteDTO;
import com.logitrack.model.Producto;
import com.logitrack.repository.BodegaRepository;
import com.logitrack.repository.MovimientoInventarioRepository;
import com.logitrack.repository.ProductoRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

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

        long totalMovimientosMes = movimientoRepository.count();

        return ResumenReporteDTO.builder()
                .totalBodegas(totalBodegas)
                .totalProductos(totalProductos)
                .productosBajoStock(productosBajoStock)
                .totalMovimientosMes(totalMovimientosMes)
                .valorTotalInventario(valorTotalInventario)
                .build();
    }
}
