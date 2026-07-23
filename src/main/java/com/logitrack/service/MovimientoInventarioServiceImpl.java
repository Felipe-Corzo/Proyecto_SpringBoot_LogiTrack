package com.logitrack.service;

import com.logitrack.exception.BadRequestException;
import com.logitrack.exception.ResourceNotFoundException;
import com.logitrack.model.*;
import com.logitrack.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class MovimientoInventarioServiceImpl implements MovimientoInventarioService {

    private final MovimientoInventarioRepository movimientoRepository;
    private final ProductoRepository productoRepository;
    private final BodegaRepository bodegaRepository;
    private final UsuarioRepository usuarioRepository;

    public MovimientoInventarioServiceImpl(MovimientoInventarioRepository movimientoRepository,
                                            ProductoRepository productoRepository,
                                            BodegaRepository bodegaRepository,
                                            UsuarioRepository usuarioRepository) {
        this.movimientoRepository = movimientoRepository;
        this.productoRepository = productoRepository;
        this.bodegaRepository = bodegaRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    public List<MovimientoInventario> obtenerTodos() {
        return movimientoRepository.findAllOrderByFechaDesc();
    }

    @Override
    public MovimientoInventario obtenerPorId(Long id) {
        return movimientoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MovimientoInventario", "id", id));
    }

    @Override
    @Transactional
    public MovimientoInventario registrarMovimiento(MovimientoInventario movimiento) {
        if (movimiento.getDetalles() == null || movimiento.getDetalles().isEmpty()) {
            throw new BadRequestException("El movimiento debe contener al menos un detalle de producto.");
        }

        // Validar usuario
        if (movimiento.getUsuario() != null && movimiento.getUsuario().getId() != null) {
            Usuario usuario = usuarioRepository.findById(movimiento.getUsuario().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Usuario", "id", movimiento.getUsuario().getId()));
            movimiento.setUsuario(usuario);
        }

        // Validar bodegas según el tipo de movimiento
        validarBodegasYTipo(movimiento);

        // Procesar cambios de stock en productos
        for (MovimientoDetalle detalle : movimiento.getDetalles()) {
            detalle.setMovimiento(movimiento);
            Producto producto = productoRepository.findById(detalle.getProducto().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Producto", "id", detalle.getProducto().getId()));

            if (movimiento.getTipoMovimiento() == TipoMovimiento.SALIDA ||
                movimiento.getTipoMovimiento() == TipoMovimiento.TRANSFERENCIA) {
                if (producto.getStock() < detalle.getCantidad()) {
                    throw new BadRequestException(String.format("Stock insuficiente para el producto '%s'. Stock actual: %d, Solicitado: %d",
                            producto.getNombre(), producto.getStock(), detalle.getCantidad()));
                }
                producto.setStock(producto.getStock() - detalle.getCantidad());
            }

            if (movimiento.getTipoMovimiento() == TipoMovimiento.ENTRADA) {
                producto.setStock(producto.getStock() + detalle.getCantidad());
            }

            productoRepository.save(producto);
            detalle.setProducto(producto);
        }

        return movimientoRepository.save(movimiento);
    }

    private void validarBodegasYTipo(MovimientoInventario m) {
        if (m.getTipoMovimiento() == TipoMovimiento.ENTRADA) {
            if (m.getBodegaDestino() == null || m.getBodegaDestino().getId() == null) {
                throw new BadRequestException("Para movimientos de ENTRADA se requiere especificar la Bodega Destino.");
            }
            Bodega destino = bodegaRepository.findById(m.getBodegaDestino().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Bodega Destino", "id", m.getBodegaDestino().getId()));
            m.setBodegaDestino(destino);
            m.setBodegaOrigen(null);
        } else if (m.getTipoMovimiento() == TipoMovimiento.SALIDA) {
            if (m.getBodegaOrigen() == null || m.getBodegaOrigen().getId() == null) {
                throw new BadRequestException("Para movimientos de SALIDA se requiere especificar la Bodega Origen.");
            }
            Bodega origen = bodegaRepository.findById(m.getBodegaOrigen().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Bodega Origen", "id", m.getBodegaOrigen().getId()));
            m.setBodegaOrigen(origen);
            m.setBodegaDestino(null);
        } else if (m.getTipoMovimiento() == TipoMovimiento.TRANSFERENCIA) {
            if (m.getBodegaOrigen() == null || m.getBodegaOrigen().getId() == null ||
                m.getBodegaDestino() == null || m.getBodegaDestino().getId() == null) {
                throw new BadRequestException("Para movimientos de TRANSFERENCIA se requieren Bodega Origen y Bodega Destino.");
            }
            if (m.getBodegaOrigen().getId().equals(m.getBodegaDestino().getId())) {
                throw new BadRequestException("La Bodega Origen y Bodega Destino no pueden ser la misma para una transferencia.");
            }
            Bodega origen = bodegaRepository.findById(m.getBodegaOrigen().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Bodega Origen", "id", m.getBodegaOrigen().getId()));
            Bodega destino = bodegaRepository.findById(m.getBodegaDestino().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Bodega Destino", "id", m.getBodegaDestino().getId()));
            m.setBodegaOrigen(origen);
            m.setBodegaDestino(destino);
        }
    }

    @Override
    public List<MovimientoInventario> buscarPorTipo(TipoMovimiento tipo) {
        return movimientoRepository.findByTipoMovimiento(tipo);
    }

    @Override
    public List<MovimientoInventario> buscarPorRangoFechas(LocalDateTime desde, LocalDateTime hasta) {
        return movimientoRepository.findByFechaBetween(desde, hasta);
    }

    @Override
    public List<MovimientoInventario> buscarPorBodega(Long bodegaId) {
        return movimientoRepository.findByBodegaId(bodegaId);
    }
}
