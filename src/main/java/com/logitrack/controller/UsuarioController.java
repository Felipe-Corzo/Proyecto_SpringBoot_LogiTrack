package com.logitrack.controller;

import com.logitrack.model.Usuario;
import com.logitrack.repository.UsuarioRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    private final UsuarioRepository usuarioRepository;

    public UsuarioController(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    // Gracias al @JsonIgnore en Usuario.password (seccion 3.1), esto ya es seguro exponerlo.
    @GetMapping
    public List<Usuario> listar() {
        return usuarioRepository.findAll();
    }
}
