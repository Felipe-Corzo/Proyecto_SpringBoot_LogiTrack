package com.logitrack.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.logitrack.audit.Auditable;
import com.logitrack.audit.AuditListener;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "movimientos_inventario")
@EntityListeners(AuditListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MovimientoInventario implements Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime fecha;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_movimiento", nullable = false, length = 20)
    private TipoMovimiento tipoMovimiento;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    // Nulo si el movimiento es ENTRADA (viene de fuera del sistema)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bodega_origen_id")
    private Bodega bodegaOrigen;

    // Nulo si el movimiento es SALIDA (sale del sistema)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bodega_destino_id")
    private Bodega bodegaDestino;

    @JsonManagedReference
    @OneToMany(mappedBy = "movimiento", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<MovimientoDetalle> detalles = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        if (this.fecha == null) {
            this.fecha = LocalDateTime.now();
        }
    }

    /** Metodo de conveniencia para mantener ambos lados de la relacion sincronizados. */
    public void agregarDetalle(MovimientoDetalle detalle) {
        detalles.add(detalle);
        detalle.setMovimiento(this);
    }

    // --- Soporte para auditoria automatica (no se persiste) ---
    @Transient
    private String auditSnapshot;

    @Override
    public Map<String, Object> auditFields() {
        // No incluimos "detalles" (coleccion): el detalle de que productos y
        // cantidades se movieron ya queda registrado en movimiento_detalle,
        // no hace falta duplicarlo en la auditoria.
        Map<String, Object> campos = new LinkedHashMap<>();
        campos.put("fecha", fecha);
        campos.put("tipoMovimiento", tipoMovimiento);
        campos.put("usuarioId", usuario != null ? usuario.getId() : null);
        campos.put("bodegaOrigenId", bodegaOrigen != null ? bodegaOrigen.getId() : null);
        campos.put("bodegaDestinoId", bodegaDestino != null ? bodegaDestino.getId() : null);
        return campos;
    }

    @Override
    public Object getAuditId() {
        return id;
    }
}
