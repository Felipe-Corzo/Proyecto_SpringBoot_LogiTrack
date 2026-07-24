# TODO: Reemplazar alert/confirm nativos por UIKit en script.js

## Cambios realizados en `src/main/resources/static/js/script.js` ✓

### 1. Eliminar bodega (adjuntarEventosFilasBodega)
- [x] Reemplazar `confirm(...)` → `await UIKit.confirmDialog({...})`
- [x] Reemplazar `alert(err.message)` → `UIKit.toast(err.message, 'error')`
- [x] Agregar `UIKit.toast('Bodega eliminada correctamente.', 'success')` en éxito

### 2. bodega-form submit (catch)
- [x] Reemplazar `alert(err.message)` → `UIKit.toast(err.message, 'error')`

### 3. Eliminar producto (adjuntarEventosFilasProducto)
- [x] Reemplazar `confirm(...)` → `await UIKit.confirmDialog({...})`
- [x] Reemplazar `alert(err.message)` → `UIKit.toast(err.message, 'error')`

### 4. product-form submit (catch)
- [x] Reemplazar `alert(err.message)` → `UIKit.toast(err.message, 'error')`

### 5. movement-form submit
- [x] Reemplazar `alert('Debes agregar al menos un producto.')` → `UIKit.toast(..., 'warning')`
- [x] Reemplazar `alert('Movimiento guardado con éxito')` → `UIKit.toast(..., 'success')`
- [x] Reemplazar `alert(err.message)` → `UIKit.toast(err.message, 'error')`

### 6. empleado-form submit (catch)
- [x] Reemplazar `alert('Error al registrar empleado: ' + err.message)` → `UIKit.toast(err.message, 'error')`

### 7. Exportar CSV auditoría
- [x] Reemplazar `alert('No hay datos para exportar.')` → `UIKit.toast(..., 'warning')`

### 8. protegerRutaAdmin (api.js)
- [x] Reemplazar `alert('Solo un administrador...')` → `UIKit.toast(..., 'error')`
