package com.logitrack.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

/**
 * Fuente real de "cuanto stock hay de cada producto en cada bodega".
 * El campo productos.stock es un total agregado; esta tabla es
 * la que se actualiza cuando se registra un movimiento.
 */
@Entity
@Table(name = "inventario_bodega")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventarioBodega {

    @EmbeddedId
    private InventarioBodegaId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("bodegaId")
    @JoinColumn(name = "bodega_id")
    private Bodega bodega;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("productoId")
    @JoinColumn(name = "producto_id")
    private Producto producto;

    @NotNull
    @Min(0)
    @Column(nullable = false)
    @Builder.Default
    private Integer cantidad = 0;
}
