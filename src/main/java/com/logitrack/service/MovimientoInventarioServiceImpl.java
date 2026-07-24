package com.logitrack.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.logitrack.config.UserContext;
import com.logitrack.exception.BadRequestException;
import com.logitrack.exception.ResourceNotFoundException;
import com.logitrack.model.*;
import com.logitrack.repository.*;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class MovimientoInventarioServiceImpl implements MovimientoInventarioService {

    private static final Logger log = LoggerFactory.getLogger(MovimientoInventarioServiceImpl.class);

    private static final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    private final MovimientoInventarioRepository movimientoRepository;
    private final ProductoRepository productoRepository;
    private final BodegaRepository bodegaRepository;
    private final UsuarioRepository usuarioRepository;
    private final InventarioBodegaRepository inventarioBodegaRepository;
    private final AuditoriaRepository auditoriaRepository;

    public MovimientoInventarioServiceImpl(MovimientoInventarioRepository movimientoRepository,
            ProductoRepository productoRepository,
            BodegaRepository bodegaRepository,
            UsuarioRepository usuarioRepository,
            InventarioBodegaRepository inventarioBodegaRepository,
            AuditoriaRepository auditoriaRepository) {
        this.movimientoRepository = movimientoRepository;
        this.productoRepository = productoRepository;
        this.bodegaRepository = bodegaRepository;
        this.usuarioRepository = usuarioRepository;
        this.inventarioBodegaRepository = inventarioBodegaRepository;
        this.auditoriaRepository = auditoriaRepository;
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

        // Obtener usuario autenticado desde UserContext (ThreadLocal)
        String username = UserContext.getUsername();
        if (username == null) {
            throw new BadRequestException("No se pudo identificar el usuario autenticado.");
        }
        Usuario usuario = usuarioRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", "username", username));
        movimiento.setUsuario(usuario);

        // Validar bodegas según el tipo de movimiento
        validarBodegasYTipo(movimiento);

        // Procesar cambios de stock en productos y en inventario_bodega
        for (MovimientoDetalle detalle : movimiento.getDetalles()) {
            detalle.setMovimiento(movimiento);
            Producto producto = productoRepository.findById(detalle.getProducto().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Producto", "id", detalle.getProducto().getId()));

            if (movimiento.getTipoMovimiento() == TipoMovimiento.ENTRADA) {
                if (movimiento.getBodegaDestino() == null) {
                    throw new BadRequestException("Para ENTRADA se requiere bodega de destino.");
                }
                InventarioBodega invDestino = inventarioBodegaRepository
                        .findByProductoIdAndBodegaId(producto.getId(), movimiento.getBodegaDestino().getId())
                        .orElseGet(() -> InventarioBodega.builder()
                                .producto(producto)
                                .bodega(movimiento.getBodegaDestino())
                                .stock(0)
                                .build());

                invDestino.setStock(invDestino.getStock() + detalle.getCantidad());
                inventarioBodegaRepository.save(invDestino);
                producto.setStock(producto.getStock() + detalle.getCantidad());

            } else if (movimiento.getTipoMovimiento() == TipoMovimiento.SALIDA) {
                if (movimiento.getBodegaOrigen() == null) {
                    throw new BadRequestException("Para SALIDA se requiere bodega de origen.");
                }
                InventarioBodega invOrigen = inventarioBodegaRepository
                        .findByProductoIdAndBodegaId(producto.getId(), movimiento.getBodegaOrigen().getId())
                        .orElseThrow(() -> new BadRequestException(String.format(
                                "El producto '%s' no tiene inventario registrado en la bodega '%s'.",
                                producto.getNombre(), movimiento.getBodegaOrigen().getNombre())));

                if (invOrigen.getStock() < detalle.getCantidad()) {
                    throw new BadRequestException(String.format(
                            "Stock insuficiente en bodega '%s' para el producto '%s'. Stock en bodega: %d, Solicitado: %d",
                            movimiento.getBodegaOrigen().getNombre(), producto.getNombre(),
                            invOrigen.getStock(), detalle.getCantidad()));
                }

                invOrigen.setStock(invOrigen.getStock() - detalle.getCantidad());
                inventarioBodegaRepository.save(invOrigen);
                producto.setStock(producto.getStock() - detalle.getCantidad());

            } else if (movimiento.getTipoMovimiento() == TipoMovimiento.TRANSFERENCIA) {
                if (movimiento.getBodegaOrigen() == null || movimiento.getBodegaDestino() == null) {
                    throw new BadRequestException("Para TRANSFERENCIA se requieren bodega origen y destino.");
                }

                InventarioBodega invOrigen = inventarioBodegaRepository
                        .findByProductoIdAndBodegaId(producto.getId(), movimiento.getBodegaOrigen().getId())
                        .orElseThrow(() -> new BadRequestException(String.format(
                                "El producto '%s' no tiene inventario en la bodega origen '%s'.",
                                producto.getNombre(), movimiento.getBodegaOrigen().getNombre())));

                if (invOrigen.getStock() < detalle.getCantidad()) {
                    throw new BadRequestException(String.format(
                            "Stock insuficiente en bodega '%s' para transferir. Stock: %d, Solicitado: %d",
                            movimiento.getBodegaOrigen().getNombre(), invOrigen.getStock(), detalle.getCantidad()));
                }

                invOrigen.setStock(invOrigen.getStock() - detalle.getCantidad());
                inventarioBodegaRepository.save(invOrigen);

                InventarioBodega invDestino = inventarioBodegaRepository
                        .findByProductoIdAndBodegaId(producto.getId(), movimiento.getBodegaDestino().getId())
                        .orElseGet(() -> InventarioBodega.builder()
                                .producto(producto)
                                .bodega(movimiento.getBodegaDestino())
                                .stock(0)
                                .build());

                invDestino.setStock(invDestino.getStock() + detalle.getCantidad());
                inventarioBodegaRepository.save(invDestino);
            }

            productoRepository.save(producto);
            detalle.setProducto(producto);
        }

        MovimientoInventario saved = movimientoRepository.save(movimiento);
        guardarAuditoria(saved);
        return saved;
    }

    private void validarBodegasYTipo(MovimientoInventario m) {
        if (m.getTipoMovimiento() == TipoMovimiento.ENTRADA) {
            if (m.getBodegaDestino() == null || m.getBodegaDestino().getId() == null) {
                throw new BadRequestException("Para movimientos de ENTRADA se requiere especificar la Bodega Destino.");
            }
            Bodega destino = bodegaRepository.findById(m.getBodegaDestino().getId())
                    .orElseThrow(
                            () -> new ResourceNotFoundException("Bodega Destino", "id", m.getBodegaDestino().getId()));
            m.setBodegaDestino(destino);
            m.setBodegaOrigen(null);
        } else if (m.getTipoMovimiento() == TipoMovimiento.SALIDA) {
            if (m.getBodegaOrigen() == null || m.getBodegaOrigen().getId() == null) {
                throw new BadRequestException("Para movimientos de SALIDA se requiere especificar la Bodega Origen.");
            }
            Bodega origen = bodegaRepository.findById(m.getBodegaOrigen().getId())
                    .orElseThrow(
                            () -> new ResourceNotFoundException("Bodega Origen", "id", m.getBodegaOrigen().getId()));
            m.setBodegaOrigen(origen);
            m.setBodegaDestino(null);
        } else if (m.getTipoMovimiento() == TipoMovimiento.TRANSFERENCIA) {
            if (m.getBodegaOrigen() == null || m.getBodegaOrigen().getId() == null ||
                    m.getBodegaDestino() == null || m.getBodegaDestino().getId() == null) {
                throw new BadRequestException(
                        "Para movimientos de TRANSFERENCIA se requieren Bodega Origen y Bodega Destino.");
            }
            if (m.getBodegaOrigen().getId().equals(m.getBodegaDestino().getId())) {
                throw new BadRequestException(
                        "La Bodega Origen y Bodega Destino no pueden ser la misma para una transferencia.");
            }
            Bodega origen = bodegaRepository.findById(m.getBodegaOrigen().getId())
                    .orElseThrow(
                            () -> new ResourceNotFoundException("Bodega Origen", "id", m.getBodegaOrigen().getId()));
            Bodega destino = bodegaRepository.findById(m.getBodegaDestino().getId())
                    .orElseThrow(
                            () -> new ResourceNotFoundException("Bodega Destino", "id", m.getBodegaDestino().getId()));
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

    private void guardarAuditoria(MovimientoInventario movimiento) {
        try {
            String username = UserContext.getUsername();
            if (username == null) {
                log.warn("No se pudo obtener usuario autenticado para auditoría de Movimiento");
                return;
            }

            Usuario usuario = usuarioRepository.findByUsername(username).orElse(null);

            Auditoria audit = Auditoria.builder()
                    .tipoOperacion(TipoOperacion.INSERT)
                    .fechaHora(LocalDateTime.now())
                    .usuario(usuario)
                    .entidadAfectada("MovimientoInventario")
                    .entidadId(movimiento.getId())
                    .valoresAnteriores(null)
                    .valoresNuevos(serializar(movimiento))
                    .build();

            auditoriaRepository.save(audit);
            log.info("Auditoría guardada: INSERT en MovimientoInventario id={}", movimiento.getId());
        } catch (Exception e) {
            log.error("Error guardando auditoría para MovimientoInventario: {}", e.getMessage(), e);
        }
    }

    private String serializar(Object entity) {
        try {
            return objectMapper.writeValueAsString(entity);
        } catch (Exception e) {
            return entity.toString();
        }
    }
}
