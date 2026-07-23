package com.logitrack.service;

import com.logitrack.model.Bodega;

import java.util.List;

public interface BodegaService {

    List<Bodega> obtenerTodas();

    Bodega obtenerPorId(Long id);

    Bodega guardar(Bodega bodega);

    Bodega actualizar(Long id, Bodega bodega);

    void eliminar(Long id);

    List<Bodega> buscarPorNombre(String nombre);
}
