# TODO - Corrección de Paginación y Bugs

## Bugs encontrados

### ❌ Productos - `pobladorCategorias()` no existe
- En `cargarProductos()` se llama a `pobladorCategorias()` que no está definida, rompiendo la carga.
- **Fix**: Eliminar la llamada a `pobladorCategorias()`.

### ❌ Movimientos - Sin paginación
- El HTML tiene estructura de paginación pero no se usa en JS.
- **Fix**: Agregar `initPaginacion()` en `filtrarYRenderizarMovimientos()`.

### ❌ Auditoría - Sin paginación
- El HTML tiene estructura de paginación pero no se usa en JS.
- **Fix**: Agregar `initPaginacion()` en `filtrarYRenderizarAuditorias()`.

## Pasos

- [x] Investigar código y entender el problema
- [ ] Corregir `pobladorCategorias()` no definida en productos
- [ ] Agregar paginación a movimientos
- [ ] Agregar paginación a auditoría
- [ ] Verificar que todo funcione

