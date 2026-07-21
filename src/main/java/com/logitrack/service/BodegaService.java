package com.logitrack.service;

import com.logitrack.model.Bodega;

import java.util.List;
import java.util.Optional;

public interface BodegaService {

    List<Bodega> obtenerTodas();

    Optional<Bodega> obtenerPorId(Long id);

    Bodega crear(Bodega bodega);

    Optional<Bodega> actualizar(Long id, Bodega datos);

    boolean eliminar(Long id);
}
