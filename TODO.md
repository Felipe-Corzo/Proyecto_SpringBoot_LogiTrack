# Plan de Implementación - Stock por Bodega y Gráfico de Barras

## Estado: ✅ COMPLETADO

### Backend
- [x] 1. Agregar endpoint `GET /api/bodegas/{id}/inventario` en BodegaController
- [x] 2. Agregar método en BodegaService/BodegaServiceImpl

### Frontend - CSS
- [x] 3. Reparar CSS del gráfico de barras en dashboard (styles.css)

### Frontend - HTML
- [x] 4. Agregar columna "Stock Total" en tabla de bodegas (bodegas.html)
- [x] 5. Agregar modal de detalle de inventario por bodega (bodegas.html)

### Frontend - JavaScript
- [x] 6. Reparar función `renderBarChart()` en script.js
- [x] 7. Agregar función `cargarInventarioBodega()` en script.js
- [x] 8. Modificar `renderBodegas()` para incluir stock total y botón ver inventario
- [x] 9. Agregar eventos para modal de inventario de bodega
