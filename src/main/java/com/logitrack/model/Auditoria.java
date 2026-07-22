package com.logitrack.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Registro de auditoria. En el paso de "Auditoria automatica" la vamos
 * a poblar desde un EntityListener (@PrePersist/@PreUpdate/@PreRemove)
 * en las entidades que queramos auditar, no manualmente.
 */
@Entity
@Table(name = "auditoria")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Auditoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_operacion", nullable = false, length = 20)
    private TipoOperacion tipoOperacion;

    @Column(name = "fecha_hora", nullable = false)
    private LocalDateTime fechaHora;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @NotNull
    @Column(name = "entidad_afectada", nullable = false, length = 100)
    private String entidadAfectada;

    @Column(name = "entidad_id", length = 50)
    private String entidadId;

    @Lob
    @Column(name = "valores_anteriores")
    private String valoresAnteriores;

    @Lob
    @Column(name = "valores_nuevos")
    private String valoresNuevos;

    @PrePersist
    protected void onCreate() {
        if (this.fechaHora == null) {
            this.fechaHora = LocalDateTime.now();
        }
    }
}
