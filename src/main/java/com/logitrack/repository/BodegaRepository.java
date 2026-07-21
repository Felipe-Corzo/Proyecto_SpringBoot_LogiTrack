package com.logitrack.repository;

import com.logitrack.model.Bodega;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BodegaRepository extends JpaRepository<Bodega, Long> {

    List<Bodega> findByEncargadoId(Long encargadoId);
}
