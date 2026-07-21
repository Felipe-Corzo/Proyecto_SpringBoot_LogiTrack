package com.logitrack.service;

import com.logitrack.exception.ResourceNotFoundException;
import com.logitrack.model.Bodega;
import com.logitrack.model.Usuario;
import com.logitrack.repository.BodegaRepository;
import com.logitrack.repository.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class BodegaServiceImpl implements BodegaService {

    private final BodegaRepository bodegaRepository;
    private final UsuarioRepository usuarioRepository;

    public BodegaServiceImpl(BodegaRepository bodegaRepository,
                              UsuarioRepository usuarioRepository) {
        this.bodegaRepository = bodegaRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    public List<Bodega> obtenerTodas() {
        return bodegaRepository.findAll();
    }

    @Override
    public Optional<Bodega> obtenerPorId(Long id) {
        return bodegaRepository.findById(id);
    }

    @Override
    public Bodega crear(Bodega bodega) {
        resolverEncargado(bodega);
        // Nos aseguramos de que sea un alta, no una actualizacion accidental
        bodega.setId(null);
        return bodegaRepository.save(bodega);
    }

    @Override
    public Optional<Bodega> actualizar(Long id, Bodega datos) {
        return bodegaRepository.findById(id).map(existente -> {
            existente.setNombre(datos.getNombre());
            existente.setUbicacion(datos.getUbicacion());
            existente.setCapacidad(datos.getCapacidad());

            datos.setId(existente.getId()); // solo para reutilizar resolverEncargado
            resolverEncargado(datos);
            existente.setEncargado(datos.getEncargado());

            return bodegaRepository.save(existente);
        });
    }

    @Override
    public boolean eliminar(Long id) {
        if (!bodegaRepository.existsById(id)) {
            return false;
        }
        bodegaRepository.deleteById(id);
        return true;
    }

    /**
     * El JSON de entrada puede traer "encargado": {"id": 2}. Buscamos el
     * Usuario real y lo colgamos en la entidad; si no existe, lanzamos error.
     * Si no se envia encargado, queda en null (bodega sin encargado asignado).
     */
    private void resolverEncargado(Bodega bodega) {
        if (bodega.getEncargado() != null && bodega.getEncargado().getId() != null) {
            Long encargadoId = bodega.getEncargado().getId();
            Usuario encargado = usuarioRepository.findById(encargadoId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "No existe un usuario con id " + encargadoId + " para asignar como encargado"));
            bodega.setEncargado(encargado);
        } else {
            bodega.setEncargado(null);
        }
    }
}
