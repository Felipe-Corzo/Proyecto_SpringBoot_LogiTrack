package com.logitrack.model;

import com.logitrack.audit.Auditable;
import com.logitrack.audit.AuditListener;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

@Entity
@Table(name = "productos")
@EntityListeners(AuditListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Producto implements Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(max = 100)
    @Column(nullable = false, length = 100)
    private String nombre;

    @Size(max = 50)
    @Column(length = 50)
    private String categoria;

    @NotNull
    @Min(0)
    @Column(nullable = false)
    @Builder.Default
    private Integer stock = 0;

    @NotNull
    @DecimalMin(value = "0.0", inclusive = true)
    @Column(nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal precio = BigDecimal.ZERO;

    // --- Soporte para auditoria automatica (no se persiste) ---
    @Transient
    private String auditSnapshot;

    @Override
    public Map<String, Object> auditFields() {
        Map<String, Object> campos = new LinkedHashMap<>();
        campos.put("nombre", nombre);
        campos.put("categoria", categoria);
        campos.put("stock", stock);
        campos.put("precio", precio);
        return campos;
    }

    @Override
    public Object getAuditId() {
        return id;
    }
}
