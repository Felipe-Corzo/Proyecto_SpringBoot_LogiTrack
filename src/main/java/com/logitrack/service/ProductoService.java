package com.logitrack.service;

import com.logitrack.model.Producto;

import java.util.List;
import java.util.Optional;

public interface ProductoService {

    List<Producto> obtenerTodos();

    Optional<Producto> obtenerPorId(Long id);

    Producto crear(Producto producto);

    Optional<Producto> actualizar(Long id, Producto datos);

    boolean eliminar(Long id);

    // Se usara desde el paso 7 (consultas avanzadas), lo dejamos listo aqui
    List<Producto> obtenerConStockBajo(Integer umbral);
}
