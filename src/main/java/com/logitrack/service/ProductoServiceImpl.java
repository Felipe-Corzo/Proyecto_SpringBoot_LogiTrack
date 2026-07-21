package com.logitrack.service;

import com.logitrack.model.Producto;
import com.logitrack.repository.ProductoRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ProductoServiceImpl implements ProductoService {

    private final ProductoRepository productoRepository;

    public ProductoServiceImpl(ProductoRepository productoRepository) {
        this.productoRepository = productoRepository;
    }

    @Override
    public List<Producto> obtenerTodos() {
        return productoRepository.findAll();
    }

    @Override
    public Optional<Producto> obtenerPorId(Long id) {
        return productoRepository.findById(id);
    }

    @Override
    public Producto crear(Producto producto) {
        producto.setId(null);
        return productoRepository.save(producto);
    }

    @Override
    public Optional<Producto> actualizar(Long id, Producto datos) {
        return productoRepository.findById(id).map(existente -> {
            existente.setNombre(datos.getNombre());
            existente.setCategoria(datos.getCategoria());
            existente.setStock(datos.getStock());
            existente.setPrecio(datos.getPrecio());
            return productoRepository.save(existente);
        });
    }

    @Override
    public boolean eliminar(Long id) {
        if (!productoRepository.existsById(id)) {
            return false;
        }
        productoRepository.deleteById(id);
        return true;
    }

    @Override
    public List<Producto> obtenerConStockBajo(Integer umbral) {
        return productoRepository.findByStockLessThan(umbral);
    }
}
