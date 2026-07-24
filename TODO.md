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

## Paso 4 - Corregir auditorías (usuario_id = null y eventos no publicados)
- [x] CREAR SpringContext.java para obtener beans de Spring sin @Autowired
- [x] CREAR UserContext.java (ThreadLocal para pasar username a través del hilo HTTP)
- [x] MODIFICAR JwtAuthenticationFilter: establecer UserContext.setUsername() al inicio del request
- [x] ELIMINAR dependencia de @EntityListeners en Bodega, Producto, MovimientoInventario
- [x] REESCRIBIR BodegaServiceImpl: guardar auditoría DIRECTAMENTE desde el service
- [x] REESCRIBIR ProductoServiceImpl: guardar auditoría DIRECTAMENTE desde el service
- [x] REESCRIBIR MovimientoInventarioServiceImpl: guardar auditoría DIRECTAMENTE desde el service
