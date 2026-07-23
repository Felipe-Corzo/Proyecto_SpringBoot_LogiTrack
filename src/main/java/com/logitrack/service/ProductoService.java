package com.logitrack.service;

import com.logitrack.model.Producto;

import java.util.List;

public interface ProductoService {

    List<Producto> obtenerTodos();

    Producto obtenerPorId(Long id);

    Producto guardar(Producto producto);

    Producto actualizar(Long id, Producto producto);

    void eliminar(Long id);

    List<Producto> buscarPorNombre(String nombre);

    List<Producto> buscarBajoStock(Integer umbral);

    List<Producto> filtrarProductos(String nombre, String categoria, Boolean bajoStock);
}
