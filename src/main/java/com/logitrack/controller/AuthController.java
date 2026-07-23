package com.logitrack.controller;

import com.logitrack.dto.AuthResponse;
import com.logitrack.dto.LoginRequest;
import com.logitrack.dto.RegisterRequest;
import com.logitrack.exception.BadRequestException;
import com.logitrack.model.Usuario;
import com.logitrack.repository.UsuarioRepository;
import com.logitrack.security.JwtTokenProvider;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    public AuthController(AuthenticationManager authenticationManager,
                          UsuarioRepository usuarioRepository,
                          PasswordEncoder passwordEncoder,
                          JwtTokenProvider tokenProvider) {
        this.authenticationManager = authenticationManager;
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getUsername(),
                        loginRequest.getPassword()
                )
        );

        String token = tokenProvider.generateToken(authentication);

        Usuario usuario = usuarioRepository.findByUsername(loginRequest.getUsername())
                .or(() -> usuarioRepository.findByEmail(loginRequest.getUsername()))
                .orElseThrow();

        return ResponseEntity.ok(AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .userId(usuario.getId())
                .username(usuario.getUsername())
                .email(usuario.getEmail())
                .rol(usuario.getRol())
                .build());
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest registerRequest) {
        if (usuarioRepository.existsByUsername(registerRequest.getUsername())) {
            throw new BadRequestException("El nombre de usuario ya está en uso.");
        }

        if (usuarioRepository.existsByEmail(registerRequest.getEmail())) {
            throw new BadRequestException("El correo electrónico ya está registrado.");
        }

        Usuario usuario = Usuario.builder()
                .username(registerRequest.getUsername())
                .email(registerRequest.getEmail())
                .password(passwordEncoder.encode(registerRequest.getPassword()))
                .rol(registerRequest.getRol())
                .build();

        usuarioRepository.save(usuario);

        return login(new LoginRequest(registerRequest.getUsername(), registerRequest.getPassword()));
    }
}
