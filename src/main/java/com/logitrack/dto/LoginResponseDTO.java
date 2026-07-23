package com.logitrack.dto;

public record LoginResponseDTO(
    String token,
    Long usuarioId,
    String username,
    String rol
) {}
