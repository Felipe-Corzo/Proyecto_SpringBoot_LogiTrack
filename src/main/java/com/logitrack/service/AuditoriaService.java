package com.logitrack.service;

import com.logitrack.model.Auditoria;

import java.util.List;

public interface AuditoriaService {

    List<Auditoria> obtenerTodas();

    Auditoria obtenerPorId(Long id);

    List<Auditoria> buscarPorEntidad(String entidad);
}
