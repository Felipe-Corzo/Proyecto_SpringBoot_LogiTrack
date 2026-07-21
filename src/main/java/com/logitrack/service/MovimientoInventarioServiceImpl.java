package com.logitrack.service;

import com.logitrack.exception.MovimientoInvalidoException;
import com.logitrack.exception.ResourceNotFoundException;
import com.logitrack.exception.StockInsuficienteException;
import com.logitrack.model.*;
import com.logitrack.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class MovimientoInventarioServiceImpl implements MovimientoInventarioService {

    private final MovimientoInventarioRepository movimientoRepository;
    private final UsuarioRepository usuarioRepository;
    private final BodegaRepository bodegaRepository;
    private final ProductoRepository productoRepository;
    private final InventarioBodegaRepository inventarioBodegaRepository;

    public MovimientoInventarioServiceImpl(MovimientoInventarioRepository movimientoRepository,
                                            UsuarioRepository usuarioRepository,
                                            BodegaRepository bodegaRepository,
                                            ProductoRepository productoRepository,
                                            InventarioBodegaRepository inventarioBodegaRepository) {
        this.movimientoRepository = movimientoRepository;
        this.usuarioRepository = usuarioRepository;
        this.bodegaRepository = bodegaRepository;
        this.productoRepository = productoRepository;
        this.inventarioBodegaRepository = inventarioBodegaRepository;
    }

    @Override
    public List<MovimientoInventario> obtenerTodos() {
        return movimientoRepository.findAll();
    }

    @Override
    public Optional<MovimientoInventario> obtenerPorId(Long id) {
        return movimientoRepository.findById(id);
    }

    @Override
    public List<MovimientoInventario> obtenerPorRangoFechas(LocalDateTime desde, LocalDateTime hasta) {
        return movimientoRepository.findByFechaBetween(desde, hasta);
    }

    @Override
    @Transactional
    public MovimientoInventario crear(MovimientoInventario movimiento) {
        movimiento.setId(null);

        validarTipoYBodegas(movimiento);

        movimiento.setUsuario(resolverUsuario(movimiento.getUsuario()));

        if (movimiento.getBodegaOrigen() != null) {
            movimiento.setBodegaOrigen(resolverBodega(movimiento.getBodegaOrigen().getId()));
        }
        if (movimiento.getBodegaDestino() != null) {
            movimiento.setBodegaDestino(resolverBodega(movimiento.getBodegaDestino().getId()));
        }

        if (movimiento.getDetalles() == null || movimiento.getDetalles().isEmpty()) {
            throw new MovimientoInvalidoException("El movimiento debe incluir al menos un producto en el detalle");
        }

        // Resolvemos y aplicamos el impacto de cada linea ANTES de guardar,
        // asi si una falla (ej. stock insuficiente) la transaccion completa
        // se revierte y no queda nada guardado a medias.
        for (MovimientoDetalle detalle : movimiento.getDetalles()) {
            if (detalle.getCantidad() == null || detalle.getCantidad() <= 0) {
                throw new MovimientoInvalidoException("La cantidad de cada producto debe ser mayor a cero");
            }
            if (detalle.getProducto() == null || detalle.getProducto().getId() == null) {
                throw new MovimientoInvalidoException("Cada linea de detalle debe indicar el producto");
            }

            Producto producto = resolverProducto(detalle.getProducto().getId());
            detalle.setProducto(producto);
            detalle.setMovimiento(movimiento);

            aplicarImpactoInventario(movimiento, producto, detalle.getCantidad());
        }

        return movimientoRepository.save(movimiento);
    }

    // ------------------------------------------------------------
    // Validaciones de negocio
    // ------------------------------------------------------------

    private void validarTipoYBodegas(MovimientoInventario movimiento) {
        if (movimiento.getTipoMovimiento() == null) {
            throw new MovimientoInvalidoException("El tipo de movimiento (ENTRADA/SALIDA/TRANSFERENCIA) es obligatorio");
        }

        boolean tieneOrigen = movimiento.getBodegaOrigen() != null && movimiento.getBodegaOrigen().getId() != null;
        boolean tieneDestino = movimiento.getBodegaDestino() != null && movimiento.getBodegaDestino().getId() != null;

        switch (movimiento.getTipoMovimiento()) {
            case ENTRADA -> {
                if (!tieneDestino) {
                    throw new MovimientoInvalidoException("Un movimiento ENTRADA requiere bodega destino");
                }
                movimiento.setBodegaOrigen(null); // una entrada no tiene origen dentro del sistema
            }
            case SALIDA -> {
                if (!tieneOrigen) {
                    throw new MovimientoInvalidoException("Un movimiento SALIDA requiere bodega origen");
                }
                movimiento.setBodegaDestino(null); // una salida no tiene destino dentro del sistema
            }
            case TRANSFERENCIA -> {
                if (!tieneOrigen || !tieneDestino) {
                    throw new MovimientoInvalidoException("Un movimiento TRANSFERENCIA requiere bodega origen y destino");
                }
                if (movimiento.getBodegaOrigen().getId().equals(movimiento.getBodegaDestino().getId())) {
                    throw new MovimientoInvalidoException("La bodega origen y destino no pueden ser la misma");
                }
            }
        }
    }

    // ------------------------------------------------------------
    // Impacto en inventario_bodega y en productos.stock (total agregado)
    // ------------------------------------------------------------

    private void aplicarImpactoInventario(MovimientoInventario movimiento, Producto producto, Integer cantidad) {
        switch (movimiento.getTipoMovimiento()) {
            case ENTRADA -> sumarInventario(movimiento.getBodegaDestino(), producto, cantidad);
            case SALIDA -> restarInventario(movimiento.getBodegaOrigen(), producto, cantidad);
            case TRANSFERENCIA -> {
                restarInventario(movimiento.getBodegaOrigen(), producto, cantidad);
                sumarInventario(movimiento.getBodegaDestino(), producto, cantidad);
            }
        }
    }

    private void sumarInventario(Bodega bodega, Producto producto, Integer cantidad) {
        InventarioBodega inventario = inventarioBodegaRepository
                .findByBodegaIdAndProductoId(bodega.getId(), producto.getId())
                .orElseGet(() -> InventarioBodega.builder()
                        .id(new InventarioBodegaId(bodega.getId(), producto.getId()))
                        .bodega(bodega)
                        .producto(producto)
                        .cantidad(0)
                        .build());

        inventario.setCantidad(inventario.getCantidad() + cantidad);
        inventarioBodegaRepository.save(inventario);

        producto.setStock(producto.getStock() + cantidad);
        productoRepository.save(producto);
    }

    private void restarInventario(Bodega bodega, Producto producto, Integer cantidad) {
        InventarioBodega inventario = inventarioBodegaRepository
                .findByBodegaIdAndProductoId(bodega.getId(), producto.getId())
                .orElseThrow(() -> new StockInsuficienteException(
                        "No hay inventario de '" + producto.getNombre() + "' registrado en " + bodega.getNombre()));

        if (inventario.getCantidad() < cantidad) {
            throw new StockInsuficienteException(
                    "Stock insuficiente de '" + producto.getNombre() + "' en " + bodega.getNombre()
                            + ". Disponible: " + inventario.getCantidad() + ", solicitado: " + cantidad);
        }

        inventario.setCantidad(inventario.getCantidad() - cantidad);
        inventarioBodegaRepository.save(inventario);

        producto.setStock(producto.getStock() - cantidad);
        productoRepository.save(producto);
    }

    // ------------------------------------------------------------
    // Resolucion de referencias (el JSON de entrada solo trae ids)
    // ------------------------------------------------------------

    private Usuario resolverUsuario(Usuario usuario) {
        if (usuario == null || usuario.getId() == null) {
            throw new MovimientoInvalidoException("Debe indicarse el usuario responsable del movimiento");
        }
        return usuarioRepository.findById(usuario.getId())
                .orElseThrow(() -> new ResourceNotFoundException("No existe el usuario con id " + usuario.getId()));
    }

    private Bodega resolverBodega(Long id) {
        return bodegaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No existe la bodega con id " + id));
    }

    private Producto resolverProducto(Long id) {
        return productoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No existe el producto con id " + id));
    }
}
