package com.logitrack.model;

import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;
import java.util.Objects;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class InventarioBodegaId implements Serializable {

    private Long bodegaId;
    private Long productoId;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof InventarioBodegaId that)) return false;
        return Objects.equals(bodegaId, that.bodegaId)
                && Objects.equals(productoId, that.productoId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(bodegaId, productoId);
    }
}
