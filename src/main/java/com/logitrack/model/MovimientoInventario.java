package com.logitrack.model;

import com.logitrack.listener.AuditEntityListener;
import jakarta.persistence.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "movimientos")
@EntityListeners(AuditEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MovimientoInventario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime fecha;

    @NotNull(message = "El tipo de movimiento es obligatorio")
    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_movimiento", nullable = false, length = 20)
    private TipoMovimiento tipoMovimiento;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "bodega_origen_id")
    private Bodega bodegaOrigen;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "bodega_destino_id")
    private Bodega bodegaDestino;

    @Valid
    @OneToMany(mappedBy = "movimiento", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private List<MovimientoDetalle> detalles = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        if (this.fecha == null) {
            this.fecha = LocalDateTime.now();
        }
    }
}
