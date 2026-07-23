package com.logitrack.dto;

import com.logitrack.model.RolUsuario;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record RegistroRequestDTO(
        @NotBlank String username,
        @NotBlank @Email String email,
        @NotBlank String password,
        RolUsuario rol // opcional: si viene null, se asigna EMPLEADO
) {}