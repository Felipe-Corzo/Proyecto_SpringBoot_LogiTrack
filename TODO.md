# TODO.md - Implementación de correcciones LogiTrack

## Paso 1 - Corregir pom.xml
- [x] 1.1 Reemplazar `spring-boot-starter-webmvc` → `spring-boot-starter-web`
- [x] 1.2 Reemplazar `spring-boot-starter-webmvc-test` → `spring-boot-starter-test`

## Paso 2 - Crear entidad InventarioBodega
- [x] Crear modelo/InventarioBodega.java

## Paso 3 - Crear repositorio InventarioBodegaRepository
- [x] Crear repository/InventarioBodegaRepository.java

## Paso 4 - Actualizar schema.sql
- [x] Agregar tabla inventario_bodega

## Paso 5 - Actualizar StockPorBodegaDTO (agregar bodegaId)
- [x] Modificar dto/StockPorBodegaDTO.java

## Paso 6 - Crear DTO ProductoConInventarioDTO
- [x] Crear dto/ProductoConInventarioDTO.java

## Paso 7 - Actualizar AuthController
- [x] 7.1 Agregar import NoSuchElementException
- [x] 7.2 Modificar método login() con try-catch
- [x] 7.3 Mejorar método register()

## Paso 8 - Actualizar GlobalExceptionHandler
- [x] 8.1 Agregar import NoSuchElementException
- [x] 8.2 Agregar handler para NoSuchElementException

## Paso 9 - Actualizar ProductoService y ProductoServiceImpl
- [x] 9.1 Actualizar interfaz ProductoService.java
- [x] 9.2 Actualizar ProductoServiceImpl.java

## Paso 10 - Actualizar ProductoController
- [x] 10.1 Agregar clase ProductoRequest
- [x] 10.2 Agregar endpoints con-inventario

## Paso 11 - Actualizar MovimientoInventarioServiceImpl
- [x] Agregar dependencia InventarioBodegaRepository
- [x] Modificar registrarMovimiento() con stock por bodega

## Paso 12 - Actualizar ReporteServiceImpl
- [x] Agregar dependencia InventarioBodegaRepository
- [x] Modificar cálculo stockPorBodega

## Paso 13 - Actualizar frontend: productos.html
- [x] Modificar modal con distribución por bodega

## Paso 14 - Actualizar frontend: script.js
- [x] 14.1 Agregar función cargarBodegasParaDistribucion()
- [x] 14.2 Agregar función calcularStockTotalDistribucion()
- [x] 14.3 Modificar abrirProductoModal()
- [x] 14.4 Modificar submit del form de producto

