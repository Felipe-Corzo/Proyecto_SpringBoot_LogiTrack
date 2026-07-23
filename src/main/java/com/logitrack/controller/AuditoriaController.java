package com.logitrack.controller;

import com.logitrack.model.Auditoria;
import com.logitrack.model.TipoOperacion;
import com.logitrack.service.AuditoriaService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// OJO: la protección real "solo ADMIN" se hace en SecurityConfig (Parte C),
// no hace falta anotar nada especial aquí.
@RestController
@RequestMapping("/api/auditorias")
public class AuditoriaController {

    private final AuditoriaService auditoriaService;

    public AuditoriaController(AuditoriaService auditoriaService) {
        this.auditoriaService = auditoriaService;
    }

    @GetMapping
    public List<Auditoria> listar() {
        return auditoriaService.obtenerTodas();
    }

    @GetMapping("/usuario/{usuarioId}")
    public List<Auditoria> porUsuario(@PathVariable Long usuarioId) {
        return auditoriaService.obtenerPorUsuario(usuarioId);
    }

    @GetMapping("/tipo/{tipoOperacion}")
    public List<Auditoria> porTipo(@PathVariable TipoOperacion tipoOperacion) {
        return auditoriaService.obtenerPorTipoOperacion(tipoOperacion);
    }

    @GetMapping("/entidad/{entidad}")
    public List<Auditoria> porEntidad(@PathVariable String entidad) {
        return auditoriaService.obtenerPorEntidad(entidad);
    }
}
