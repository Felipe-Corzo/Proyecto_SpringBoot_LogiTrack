package com.logitrack.service;

import com.logitrack.model.Auditoria;
import com.logitrack.model.TipoOperacion;

import java.util.List;

public interface AuditoriaService {
    List<Auditoria> obtenerTodas();
    Auditoria obtenerPorId(Long id);
    List<Auditoria> buscarPorEntidad(String entidad);
    List<Auditoria> buscarPorUsuario(Long usuarioId);        // NUEVO
    List<Auditoria> buscarPorTipoOperacion(TipoOperacion tipo); // NUEVO
}
