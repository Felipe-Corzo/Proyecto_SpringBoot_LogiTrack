package com.logitrack.service;

import com.logitrack.exception.BadRequestException;
import com.logitrack.exception.ResourceNotFoundException;
import com.logitrack.model.Bodega;
import com.logitrack.repository.BodegaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class BodegaServiceImpl implements BodegaService {

    private final BodegaRepository bodegaRepository;

    public BodegaServiceImpl(BodegaRepository bodegaRepository) {
        this.bodegaRepository = bodegaRepository;
    }

    @Override
    public List<Bodega> obtenerTodas() {
        return bodegaRepository.findAll();
    }

    @Override
    public Bodega obtenerPorId(Long id) {
        return bodegaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bodega", "id", id));
    }

    @Override
    @Transactional
    public Bodega guardar(Bodega bodega) {
        if (bodegaRepository.existsByNombreIgnoreCase(bodega.getNombre())) {
            throw new BadRequestException("Ya existe una bodega con el nombre: " + bodega.getNombre());
        }
        return bodegaRepository.save(bodega);
    }

    @Override
    @Transactional
    public Bodega actualizar(Long id, Bodega bodega) {
        Bodega bodegaExistente = obtenerPorId(id);
        
        if (!bodegaExistente.getNombre().equalsIgnoreCase(bodega.getNombre()) &&
            bodegaRepository.existsByNombreIgnoreCase(bodega.getNombre())) {
            throw new BadRequestException("Ya existe otra bodega con el nombre: " + bodega.getNombre());
        }

        bodegaExistente.setNombre(bodega.getNombre());
        bodegaExistente.setUbicacion(bodega.getUbicacion());
        bodegaExistente.setCapacidad(bodega.getCapacidad());
        bodegaExistente.setEncargado(bodega.getEncargado());

        return bodegaRepository.save(bodegaExistente);
    }

    @Override
    @Transactional
    public void eliminar(Long id) {
        Bodega bodega = obtenerPorId(id);
        bodegaRepository.delete(bodega);
    }

    @Override
    public List<Bodega> buscarPorNombre(String nombre) {
        return bodegaRepository.findByNombreContainingIgnoreCase(nombre);
    }
}
