package com.logitrack.controller;

import com.logitrack.model.Auditoria;
import com.logitrack.service.AuditoriaService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/auditorias")
@PreAuthorize("hasRole('ADMIN')")
public class AuditoriaController {

    private final AuditoriaService auditoriaService;

    public AuditoriaController(AuditoriaService auditoriaService) {
        this.auditoriaService = auditoriaService;
    }

    @GetMapping
    public ResponseEntity<List<Auditoria>> obtenerTodas() {
        return ResponseEntity.ok(auditoriaService.obtenerTodas());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Auditoria> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(auditoriaService.obtenerPorId(id));
    }

    @GetMapping("/entidad/{entidad}")
    public ResponseEntity<List<Auditoria>> buscarPorEntidad(@PathVariable String entidad) {
        return ResponseEntity.ok(auditoriaService.buscarPorEntidad(entidad));
    }
}
