package com.logitrack.controller;

import com.logitrack.dto.LoginRequestDTO;
import com.logitrack.dto.LoginResponseDTO;
import com.logitrack.dto.RegistroRequestDTO;
import com.logitrack.exception.ResourceNotFoundException;
import com.logitrack.model.RolUsuario;
import com.logitrack.model.Usuario;
import com.logitrack.repository.UsuarioRepository;
import com.logitrack.security.JwtUtil;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthController(AuthenticationManager authenticationManager,
                           UsuarioRepository usuarioRepository,
                           PasswordEncoder passwordEncoder,
                           JwtUtil jwtUtil) {
        this.authenticationManager = authenticationManager;
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/register")
    public ResponseEntity<LoginResponseDTO> registrar(@Valid @RequestBody RegistroRequestDTO datos) {
        if (usuarioRepository.existsByUsername(datos.username())) {
            throw new IllegalArgumentException("El nombre de usuario ya existe");
        }
        if (usuarioRepository.existsByEmail(datos.email())) {
            throw new IllegalArgumentException("El correo ya esta registrado");
        }

        Usuario usuario = Usuario.builder()
                .username(datos.username())
                .email(datos.email())
                .password(passwordEncoder.encode(datos.password()))
                .rol(datos.rol() != null ? datos.rol() : RolUsuario.EMPLEADO)
                .activo(true)
                .build();

        Usuario creado = usuarioRepository.save(usuario);
        String token = jwtUtil.generarToken(creado.getId(), creado.getUsername(), creado.getRol().name());

        return ResponseEntity.status(201).body(
                new LoginResponseDTO(token, creado.getId(), creado.getUsername(), creado.getRol().name()));
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponseDTO> login(@Valid @RequestBody LoginRequestDTO datos) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(datos.username(), datos.password()));

        Usuario usuario = usuarioRepository.findByUsername(datos.username())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));

        String token = jwtUtil.generarToken(usuario.getId(), usuario.getUsername(), usuario.getRol().name());

        return ResponseEntity.ok(
                new LoginResponseDTO(token, usuario.getId(), usuario.getUsername(), usuario.getRol().name()));
    }

    // Util para que el frontend sepa quien esta logueado y su rol sin decodificar el JWT a mano
    @GetMapping("/me")
    public ResponseEntity<LoginResponseDTO> me(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        Long usuarioId = jwtUtil.extraerUsuarioId(token);

        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));

        return ResponseEntity.ok(
                new LoginResponseDTO(token, usuario.getId(), usuario.getUsername(), usuario.getRol().name()));
    }
}
