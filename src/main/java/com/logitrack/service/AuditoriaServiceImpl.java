package com.logitrack.service;

import com.logitrack.exception.ResourceNotFoundException;
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
        return auditoriaRepository.findAllByOrderByFechaHoraDesc();
    }

    @Override
    public Auditoria obtenerPorId(Long id) {
        return auditoriaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Auditoria", "id", id));
    }

    @Override
    public List<Auditoria> buscarPorEntidad(String entidad) {
        return auditoriaRepository.findByEntidadAfectadaIgnoreCase(entidad);
    }

    @Override
    public List<Auditoria> buscarPorUsuario(Long usuarioId) {
        return auditoriaRepository.findByUsuario_Id(usuarioId);
    }

    @Override
    public List<Auditoria> buscarPorTipoOperacion(TipoOperacion tipo) {
        return auditoriaRepository.findByTipoOperacion(tipo);
    }
}
