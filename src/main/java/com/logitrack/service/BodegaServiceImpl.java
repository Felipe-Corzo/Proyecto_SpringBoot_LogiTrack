package com.logitrack.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.logitrack.config.UserContext;
import com.logitrack.exception.BadRequestException;
import com.logitrack.exception.ResourceNotFoundException;
import com.logitrack.model.Auditoria;
import com.logitrack.model.Bodega;
import com.logitrack.model.MovimientoInventario;
import com.logitrack.model.TipoOperacion;
import com.logitrack.model.Usuario;
import com.logitrack.repository.AuditoriaRepository;
import com.logitrack.model.InventarioBodega;
import com.logitrack.repository.BodegaRepository;
import com.logitrack.repository.InventarioBodegaRepository;
import com.logitrack.repository.MovimientoInventarioRepository;
import com.logitrack.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class BodegaServiceImpl implements BodegaService {

    private static final Logger log = LoggerFactory.getLogger(BodegaServiceImpl.class);

    private static final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    private final BodegaRepository bodegaRepository;
    private final AuditoriaRepository auditoriaRepository;
    private final UsuarioRepository usuarioRepository;
    private final InventarioBodegaRepository inventarioBodegaRepository;
    private final MovimientoInventarioRepository movimientoRepository;

    public BodegaServiceImpl(BodegaRepository bodegaRepository,
                              AuditoriaRepository auditoriaRepository,
                              UsuarioRepository usuarioRepository,
                              InventarioBodegaRepository inventarioBodegaRepository,
                              MovimientoInventarioRepository movimientoRepository) {
        this.bodegaRepository = bodegaRepository;
        this.auditoriaRepository = auditoriaRepository;
        this.usuarioRepository = usuarioRepository;
        this.inventarioBodegaRepository = inventarioBodegaRepository;
        this.movimientoRepository = movimientoRepository;
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
        Bodega saved = bodegaRepository.save(bodega);
        guardarAuditoria(TipoOperacion.INSERT, saved, null, serializar(saved));
        return saved;
    }

    @Override
    @Transactional
    public Bodega actualizar(Long id, Bodega bodega) {
        Bodega bodegaExistente = obtenerPorId(id);
        String valoresAnteriores = serializar(bodegaExistente);

        if (!bodegaExistente.getNombre().equalsIgnoreCase(bodega.getNombre()) &&
            bodegaRepository.existsByNombreIgnoreCase(bodega.getNombre())) {
            throw new BadRequestException("Ya existe otra bodega con el nombre: " + bodega.getNombre());
        }

        bodegaExistente.setNombre(bodega.getNombre());
        bodegaExistente.setUbicacion(bodega.getUbicacion());
        bodegaExistente.setCapacidad(bodega.getCapacidad());
        bodegaExistente.setEncargado(bodega.getEncargado());

        Bodega saved = bodegaRepository.save(bodegaExistente);
        guardarAuditoria(TipoOperacion.UPDATE, saved, valoresAnteriores, serializar(saved));
        return saved;
    }

    @Override
    @Transactional
    public void eliminar(Long id) {
        Bodega bodega = obtenerPorId(id);
        String valoresAnteriores = serializar(bodega);

        // Eliminar inventario asociado a esta bodega
        List<InventarioBodega> inventarios = inventarioBodegaRepository.findByBodegaId(id);
        if (!inventarios.isEmpty()) {
            inventarioBodegaRepository.deleteAll(inventarios);
        }

        // Limpiar referencias en movimientos que usan esta bodega como origen o destino
        List<MovimientoInventario> movimientos = movimientoRepository.findByBodegaId(id);
        for (MovimientoInventario mov : movimientos) {
            if (mov.getBodegaOrigen() != null && mov.getBodegaOrigen().getId().equals(id)) {
                mov.setBodegaOrigen(null);
            }
            if (mov.getBodegaDestino() != null && mov.getBodegaDestino().getId().equals(id)) {
                mov.setBodegaDestino(null);
            }
            movimientoRepository.save(mov);
        }

        bodegaRepository.delete(bodega);
        guardarAuditoria(TipoOperacion.DELETE, bodega, valoresAnteriores, null);
    }

    @Override
    public List<Bodega> buscarPorNombre(String nombre) {
        return bodegaRepository.findByNombreContainingIgnoreCase(nombre);
    }

    @Override
    public List<InventarioBodega> obtenerInventarioPorBodega(Long bodegaId) {
        Bodega bodega = obtenerPorId(bodegaId);
        return inventarioBodegaRepository.findByBodegaId(bodegaId);
    }

    private void guardarAuditoria(TipoOperacion tipo, Bodega bodega, String valoresAnteriores, String valoresNuevos) {
        try {
            String username = UserContext.getUsername();
            if (username == null) {
                log.warn("No se pudo obtener usuario autenticado para auditoría de Bodega");
                return;
            }

            Usuario usuario = usuarioRepository.findByUsername(username).orElse(null);

            Auditoria audit = Auditoria.builder()
                    .tipoOperacion(tipo)
                    .fechaHora(LocalDateTime.now())
                    .usuario(usuario)
                    .entidadAfectada("Bodega")
                    .entidadId(bodega.getId())
                    .valoresAnteriores(valoresAnteriores)
                    .valoresNuevos(valoresNuevos)
                    .build();

            auditoriaRepository.save(audit);
            log.info("Auditoría guardada: {} en Bodega id={}", tipo, bodega.getId());
        } catch (Exception e) {
            log.error("Error guardando auditoría para Bodega: {}", e.getMessage(), e);
        }
    }

    private String serializar(Object entity) {
        try {
            return objectMapper.writeValueAsString(entity);
        } catch (Exception e) {
            return entity.toString();
        }
    }
}
