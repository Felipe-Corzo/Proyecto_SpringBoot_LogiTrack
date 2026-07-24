# TODO - Correcciones LogiTrack

## Paso 1 - Corregir MovimientoInventarioServiceImpl.java
- [x] Agregar dependencia InventarioBodegaRepository al constructor
- [x] Reemplazar lógica de procesamiento de stock para usar inventario_bodega

## Paso 2 - Corregir AuditEntityListener.java
- [x] Agregar SecurityContextHolder para obtener usuario autenticado
- [x] Buscar Usuario en BD por username del authentication
- [x] Asignar usuario al registro de Auditoria

## Paso 3 - Corregir frontend (script.js) - Edición de productos
- [x] Modificar cargarBodegasParaDistribucion() para deshabilitar campos en edición
- [x] Mostrar mensaje informativo en zona de stock cuando es edición
- [x] En submit, cuando es edición: NO enviar stockPorBodega, usar PUT /api/productos/{id}

