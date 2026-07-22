package com.logitrack.model;

import com.logitrack.audit.Auditable;
import com.logitrack.audit.AuditListener;
import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.LinkedHashMap;
import java.util.Map;

@Entity
@Table(name = "bodegas")
@EntityListeners(AuditListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Bodega implements Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(max = 100)
    @Column(nullable = false, length = 100)
    private String nombre;

    @NotBlank
    @Size(max = 150)
    @Column(nullable = false, length = 150)
    private String ubicacion;

    @NotNull
    @Min(1)
    @Column(nullable = false)
    private Integer capacidad;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "encargado_id")
    private Usuario encargado;

    // --- Soporte para auditoria automatica (no se persiste) ---
    @Transient
    private String auditSnapshot;

    @Override
    public Map<String, Object> auditFields() {
        Map<String, Object> campos = new LinkedHashMap<>();
        campos.put("nombre", nombre);
        campos.put("ubicacion", ubicacion);
        campos.put("capacidad", capacidad);
        campos.put("encargadoId", encargado != null ? encargado.getId() : null);
        return campos;
    }

    @Override
    public Object getAuditId() {
        return id;
    }
}
