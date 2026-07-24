package com.logitrack.service;

import com.logitrack.dto.ProductoConInventarioDTO;
import com.logitrack.exception.ResourceNotFoundException;
import com.logitrack.model.Bodega;
import com.logitrack.model.InventarioBodega;
import com.logitrack.model.Producto;
import com.logitrack.repository.BodegaRepository;
import com.logitrack.repository.InventarioBodegaRepository;
import com.logitrack.repository.ProductoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ProductoServiceImpl implements ProductoService {

    private final ProductoRepository productoRepository;
    private final InventarioBodegaRepository inventarioBodegaRepository;
    private final BodegaRepository bodegaRepository;

    public ProductoServiceImpl(ProductoRepository productoRepository,
                                InventarioBodegaRepository inventarioBodegaRepository,
                                BodegaRepository bodegaRepository) {
        this.productoRepository = productoRepository;
        this.inventarioBodegaRepository = inventarioBodegaRepository;
        this.bodegaRepository = bodegaRepository;
    }

    @Override
    public List<Producto> obtenerTodos() {
        return productoRepository.findAll();
    }

    @Override
    public Producto obtenerPorId(Long id) {
        return productoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Producto", "id", id));
    }

    @Override
    @Transactional
    public Producto guardar(Producto producto) {
        producto.setStock(0);
        return productoRepository.save(producto);
    }

    @Override
    @Transactional
    public Producto guardarConInventario(Producto producto, Map<Long, Integer> stockPorBodega) {
        int stockTotal = 0;
        producto.setStock(0);
        Producto saved = productoRepository.save(producto);

        if (stockPorBodega != null && !stockPorBodega.isEmpty()) {
            for (Map.Entry<Long, Integer> entry : stockPorBodega.entrySet()) {
                Long bodegaId = entry.getKey();
                Integer cantidad = entry.getValue();

                if (cantidad == null || cantidad <= 0) continue;

                Bodega bodega = bodegaRepository.findById(bodegaId)
                        .orElseThrow(() -> new ResourceNotFoundException("Bodega", "id", bodegaId));

                InventarioBodega inventario = InventarioBodega.builder()
                        .producto(saved)
                        .bodega(bodega)
                        .stock(cantidad)
                        .build();
                inventarioBodegaRepository.save(inventario);

                stockTotal += cantidad;
            }
        }

        saved.setStock(stockTotal);
        return productoRepository.save(saved);
    }

    @Override
    @Transactional
    public Producto actualizar(Long id, Producto producto) {
        Producto productoExistente = obtenerPorId(id);

        productoExistente.setNombre(producto.getNombre());
        productoExistente.setCategoria(producto.getCategoria());
        productoExistente.setPrecio(producto.getPrecio());

        return productoRepository.save(productoExistente);
    }

    @Override
    @Transactional
    public Producto actualizarConInventario(Long id, Producto producto, Map<Long, Integer> stockPorBodega) {
        Producto productoExistente = obtenerPorId(id);

        productoExistente.setNombre(producto.getNombre());
        productoExistente.setCategoria(producto.getCategoria());
        productoExistente.setPrecio(producto.getPrecio());

        // Limpiar inventarios existentes
        List<InventarioBodega> inventariosExistentes = inventarioBodegaRepository.findByProductoId(id);
        inventarioBodegaRepository.deleteAll(inventariosExistentes);

        // Re-crear inventarios
        int stockTotal = 0;
        if (stockPorBodega != null && !stockPorBodega.isEmpty()) {
            for (Map.Entry<Long, Integer> entry : stockPorBodega.entrySet()) {
                Long bodegaId = entry.getKey();
                Integer cantidad = entry.getValue();

                if (cantidad == null || cantidad <= 0) continue;

                Bodega bodega = bodegaRepository.findById(bodegaId)
                        .orElseThrow(() -> new ResourceNotFoundException("Bodega", "id", bodegaId));

                InventarioBodega inventario = InventarioBodega.builder()
                        .producto(productoExistente)
                        .bodega(bodega)
                        .stock(cantidad)
                        .build();
                inventarioBodegaRepository.save(inventario);

                stockTotal += cantidad;
            }
        }

        productoExistente.setStock(stockTotal);
        return productoRepository.save(productoExistente);
    }

    @Override
    @Transactional
    public void eliminar(Long id) {
        Producto producto = obtenerPorId(id);
        productoRepository.delete(producto);
    }

    @Override
    public List<Producto> buscarPorNombre(String nombre) {
        return productoRepository.findByNombreContainingIgnoreCase(nombre);
    }

    @Override
    public List<Producto> buscarBajoStock(Integer umbral) {
        return productoRepository.findByStockLessThan(umbral != null ? umbral : 10);
    }

    @Override
    public List<Producto> filtrarProductos(String nombre, String categoria, Boolean bajoStock) {
        return productoRepository.filtrarProductos(
                (nombre != null && !nombre.isBlank()) ? nombre : null,
                (categoria != null && !categoria.isBlank()) ? categoria : null,
                bajoStock
        );
    }

    @Override
    public List<ProductoConInventarioDTO> obtenerTodosConInventario() {
        List<Producto> productos = productoRepository.findAll();
        List<Long> productoIds = productos.stream().map(Producto::getId).toList();
        List<InventarioBodega> todosInventarios = inventarioBodegaRepository.findByProductoIdIn(productoIds);

        Map<Long, List<InventarioBodega>> inventarioMap = todosInventarios.stream()
                .collect(Collectors.groupingBy(inv -> inv.getProducto().getId()));

        return productos.stream()
                .map(p -> ProductoConInventarioDTO.fromProducto(p,
                        inventarioMap.getOrDefault(p.getId(), List.of())))
                .toList();
    }

    @Override
    public ProductoConInventarioDTO obtenerConInventarioPorId(Long id) {
        Producto producto = obtenerPorId(id);
        List<InventarioBodega> inventarios = inventarioBodegaRepository.findByProductoId(id);
        return ProductoConInventarioDTO.fromProducto(producto, inventarios);
    }
}
