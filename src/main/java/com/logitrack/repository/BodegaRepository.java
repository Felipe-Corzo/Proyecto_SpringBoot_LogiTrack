package com.logitrack.repository;

import com.logitrack.model.Bodega;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BodegaRepository extends JpaRepository<Bodega, Long> {

    List<Bodega> findByNombreContainingIgnoreCase(String nombre);

    Boolean existsByNombreIgnoreCase(String nombre);
}
