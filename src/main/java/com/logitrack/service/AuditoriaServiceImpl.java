package com.logitrack.service;

import com.logitrack.model.Auditoria;
import com.logitrack.model.TipoOperacion;
import com.logitrack.repository.AuditoriaRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AuditoriaServiceImpl implements AuditoriaService {

    private final AuditoriaRepository auditoriaRepository;

    public AuditoriaServiceImpl(AuditoriaRepository auditoriaRepository) {
        this.auditoriaRepository = auditoriaRepository;
    }

    @Override
    public List<Auditoria> obtenerTodas() {
        return auditoriaRepository.findAll();
    }

    @Override
    public List<Auditoria> obtenerPorUsuario(Long usuarioId) {
        return auditoriaRepository.findByUsuarioId(usuarioId);
    }

    @Override
    public List<Auditoria> obtenerPorTipoOperacion(TipoOperacion tipo) {
        return auditoriaRepository.findByTipoOperacion(tipo);
    }

    @Override
    public List<Auditoria> obtenerPorEntidad(String entidad) {
        return auditoriaRepository.findByEntidadAfectada(entidad);
    }
}
