# TODO: Validaciones de Capacidad de Bodega ✅ COMPLETADO

## Objetivo
Agregar validaciones de 'capacidad bodega' en todos los movimientos (ENTRADA, SALIDA, TRANSFERENCIA) y al registrar/actualizar nuevo producto con inventario.

Regla: `if (capacidad de la bodega <= cantidad de productos)` → ERROR "la bodega tiene la capacidad al maximo"

## Pasos

### 1. Modificar `MovimientoInventarioServiceImpl.java` ✅
- [x] **ENTRADA**: Validación usando `<=`, lanza error "La bodega '%s' tiene la capacidad al máximo"
- [x] **SALIDA**: Validación de capacidad en bodega origen
- [x] **TRANSFERENCIA**: Validación de capacidad en bodega destino

### 2. Modificar `ProductoServiceImpl.java` ✅
- [x] **guardarConInventario**: Validación de capacidad por bodega
- [x] **actualizarConInventario**: Validación de capacidad por bodega

### 3. Verificar compilación ✅
- [x] `mvn compile` - Compilación exitosa sin errores

