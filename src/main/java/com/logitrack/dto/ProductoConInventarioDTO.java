package com.logitrack.dto;

import com.logitrack.model.InventarioBodega;
import com.logitrack.model.Producto;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductoConInventarioDTO {

    private Long id;
    private String nombre;
    private String categoria;
    private Integer stock;
    private BigDecimal precio;
    private List<StockPorBodegaDTO> distribucionStock;

    public static ProductoConInventarioDTO fromProducto(Producto producto, List<InventarioBodega> inventarios) {
        return ProductoConInventarioDTO.builder()
                .id(producto.getId())
                .nombre(producto.getNombre())
                .categoria(producto.getCategoria())
                .stock(producto.getStock())
                .precio(producto.getPrecio())
                .distribucionStock(inventarios.stream()
                        .map(inv -> StockPorBodegaDTO.builder()
                                .bodegaNombre(inv.getBodega().getNombre())
                                .bodegaId(inv.getBodega().getId())
                                .stockTotal(inv.getStock())
                                .build())
                        .toList())
                .build();
    }
}

