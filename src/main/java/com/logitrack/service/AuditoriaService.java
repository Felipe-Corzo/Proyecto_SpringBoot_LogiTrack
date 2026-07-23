package com.logitrack.service;

import com.logitrack.model.Auditoria;
import com.logitrack.model.TipoOperacion;

import java.util.List;

public interface AuditoriaService {
    List<Auditoria> obtenerTodas();
    List<Auditoria> obtenerPorUsuario(Long usuarioId);
    List<Auditoria> obtenerPorTipoOperacion(TipoOperacion tipo);
    List<Auditoria> obtenerPorEntidad(String entidad);
}