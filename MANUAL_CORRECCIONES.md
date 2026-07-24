# MANUAL DE CORRECCIONES - LogiTrack WMS

---

## 📋 ÍNDICE

1. [Corrección pom.xml](#1-corrección-pomxml)
2. [Corrección AuthController y Login](#2-corrección-authcontroller-y-login)
3. [Mejora GlobalExceptionHandler](#3-mejora-globalexceptionhandler)
4. [Nueva entidad: InventarioBodega (stock por bodega)](#4-nueva-entidad-inventariobodega-stock-por-bodega)
5. [Nuevo DTO: ProductoConInventarioDTO](#5-nuevo-dto-productoconinventariodto)
6. [Nuevo Repository: InventarioBodegaRepository](#6-nuevo-repository-inventariobodegarepository)
7. [Actualizar ProductoService y ProductoServiceImpl](#7-actualizar-productoservice-y-productoserviceimpl)
8. [Actualizar ProductoController](#8-actualizar-productocontroller)
9. [Actualizar schema.sql](#9-actualizar-schemasql)
10. [Actualizar MovimientoInventarioServiceImpl (stock x bodega)](#10-actualizar-movimientoinventarioserviceimpl-stock-x-bodega)
11. [Actualizar ReporteServiceImpl](#11-actualizar-reporteserviceimpl)
12. [Corregir frontend: modal de producto con distribución por bodega](#12-corregir-frontend-modal-de-producto-con-distribución-por-bodega)
13. [Corregir frontend: formulario de movimiento](#13-corregir-frontend-formulario-de-movimiento)
14. [Secuencia de Implementación](#14-secuencia-de-implementación)

---

## 1. Corrección pom.xml

### Problema
Los artifactIds `spring-boot-starter-webmvc` y `spring-boot-starter-webmvc-test` **NO EXISTEN** en Maven Central. Los nombres correctos son:
- `spring-boot-starter-web`
- `spring-boot-starter-test`

### Archivo: `pom.xml`

#### 1.1 Reemplazar dependencia incorrecta de Web MVC:

**BLOQUE A REEMPLAZAR (líneas ~27-29):**
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webmvc</artifactId>
</dependency>
```

**REEMPLAZAR POR:**
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

#### 1.2 Reemplazar dependencia incorrecta de Test:

**BLOQUE A REEMPLAZAR (líneas ~43-45):**
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webmvc-test</artifactId>
    <scope>test</scope>
</dependency>
```

**REEMPLAZAR POR:**
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
```

---

## 2. Corrección AuthController y Login

### Problemas
1. El método `login()` busca al usuario en BD después de autenticar, pero si no lo encuentra (caso extremo), lanza `NoSuchElementException` (unchecked) que da error 500.
2. El método `register()` llama a `login()` internamente, que puede fallar si el usuario recién creado no se autentica correctamente.
3. La respuesta de error de `BadRequestException` usa el campo `error` en vez de `message`. El frontend en `api.js` espera `err.error`.

### Archivo: `src/main/java/com/logitrack/controller/AuthController.java`

#### 2.1 Importar `NoSuchElementException`:

Agregar al inicio de los imports:
```java
import java.util.NoSuchElementException;
```

#### 2.2 Modificar método `login()` con try-catch:

**BLOQUE A REEMPLAZAR (método login completo):**
```java
@PostMapping("/login")
public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest loginRequest) {
    Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                    loginRequest.getUsername(),
                    loginRequest.getPassword()
            )
    );

    String token = tokenProvider.generateToken(authentication);

    Usuario usuario = usuarioRepository.findByUsername(loginRequest.getUsername())
            .or(() -> usuarioRepository.findByEmail(loginRequest.getUsername()))
            .orElseThrow();

    return ResponseEntity.ok(AuthResponse.builder()
            .token(token)
            .tokenType("Bearer")
            .userId(usuario.getId())
            .username(usuario.getUsername())
            .email(usuario.getEmail())
            .rol(usuario.getRol())
            .build());
}
```

**REEMPLAZAR POR:**
```java
@PostMapping("/login")
public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest loginRequest) {
    Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                    loginRequest.getUsername(),
                    loginRequest.getPassword()
            )
    );

    String token = tokenProvider.generateToken(authentication);

    try {
        Usuario usuario = usuarioRepository.findByUsername(loginRequest.getUsername())
                .or(() -> usuarioRepository.findByEmail(loginRequest.getUsername()))
                .orElseThrow(() -> new NoSuchElementException("Usuario no encontrado después de autenticación"));

        return ResponseEntity.ok(AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .userId(usuario.getId())
                .username(usuario.getUsername())
                .email(usuario.getEmail())
                .rol(usuario.getRol())
                .build());
    } catch (NoSuchElementException e) {
        throw new BadRequestException("Error al recuperar datos del usuario autenticado. Contacte al administrador.");
    }
}
```

#### 2.3 Mejorar método `register()` para capturar errores:

**BLOQUE A REEMPLAZAR (método register completo):**
```java
@PostMapping("/register")
public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest registerRequest) {
    if (usuarioRepository.existsByUsername(registerRequest.getUsername())) {
        throw new BadRequestException("El nombre de usuario ya está en uso.");
    }

    if (usuarioRepository.existsByEmail(registerRequest.getEmail())) {
        throw new BadRequestException("El correo electrónico ya está registrado.");
    }

    Usuario usuario = Usuario.builder()
            .username(registerRequest.getUsername())
            .email(registerRequest.getEmail())
            .password(passwordEncoder.encode(registerRequest.getPassword()))
            .rol(registerRequest.getRol())
            .build();

    usuarioRepository.save(usuario);

    return login(new LoginRequest(registerRequest.getUsername(), registerRequest.getPassword()));
}
```

**REEMPLAZAR POR:**
```java
@PostMapping("/register")
public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest registerRequest) {
    if (usuarioRepository.existsByUsername(registerRequest.getUsername())) {
        throw new BadRequestException("El nombre de usuario ya está en uso.");
    }

    if (usuarioRepository.existsByEmail(registerRequest.getEmail())) {
        throw new BadRequestException("El correo electrónico ya está registrado.");
    }

    if (registerRequest.getRol() == null) {
        throw new BadRequestException("El rol es obligatorio. Valores permitidos: ADMIN, EMPLEADO.");
    }

    Usuario usuario = Usuario.builder()
            .username(registerRequest.getUsername().trim())
            .email(registerRequest.getEmail().trim().toLowerCase())
            .password(passwordEncoder.encode(registerRequest.getPassword()))
            .rol(registerRequest.getRol())
            .build();

    try {
        usuarioRepository.save(usuario);
    } catch (Exception e) {
        throw new BadRequestException("Error al registrar el usuario: " + e.getMessage());
    }

    return login(new LoginRequest(registerRequest.getUsername(), registerRequest.getPassword()));
}
```

---

## 3. Mejora GlobalExceptionHandler

### Archivo: `src/main/java/com/logitrack/exception/GlobalExceptionHandler.java`

#### 3.1 Agregar handler para NoSuchElementException:

Agregar **después del método `handleBadRequestException`**:

```java
@ExceptionHandler(NoSuchElementException.class)
public ResponseEntity<Map<String, Object>> handleNoSuchElementException(NoSuchElementException ex) {
    Map<String, Object> response = new HashMap<>();
    response.put("timestamp", LocalDateTime.now());
    response.put("status", HttpStatus.NOT_FOUND.value());
    response.put("error", "Not Found");
    response.put("message", ex.getMessage() != null ? ex.getMessage() : "El recurso solicitado no fue encontrado.");
    return new ResponseEntity<>(response, HttpStatus.NOT_FOUND);
}
```

#### 3.2 Agregar el import al inicio:

```java
import java.util.NoSuchElementException;
```

---

## 4. Nueva entidad: InventarioBodega (stock por bodega)

### Crear archivo: `src/main/java/com/logitrack/model/InventarioBodega.java`

```java
package com.logitrack.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Entity
@Table(name = "inventario_bodega", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"producto_id", "bodega_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventarioBodega {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "El producto es obligatorio")
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    @NotNull(message = "La bodega es obligatoria")
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "bodega_id", nullable = false)
    private Bodega bodega;

    @NotNull(message = "El stock en bodega es obligatorio")
    @Min(value = 0, message = "El stock no puede ser negativo")
    @Column(nullable = false)
    private Integer stock;
}
```

---

## 5. Nuevo DTO: ProductoConInventarioDTO

### Crear archivo: `src/main/java/com/logitrack/dto/ProductoConInventarioDTO.java`

```java
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
    private Integer stock; // stock total (suma de todas las bodegas)
    private BigDecimal precio;
    private List<StockPorBodegaDTO> distribucionStock; // stock por bodega

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
```

### Modificar `StockPorBodegaDTO.java` para incluir `bodegaId`:

```java
package com.logitrack.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockPorBodegaDTO {

    private Long bodegaId;      // NUEVO
    private String bodegaNombre;
    private long stockTotal;
}
```

---

## 6. Nuevo Repository: InventarioBodegaRepository

### Crear archivo: `src/main/java/com/logitrack/repository/InventarioBodegaRepository.java`

```java
package com.logitrack.repository;

import com.logitrack.model.InventarioBodega;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InventarioBodegaRepository extends JpaRepository<InventarioBodega, Long> {

    List<InventarioBodega> findByProductoId(Long productoId);

    List<InventarioBodega> findByBodegaId(Long bodegaId);

    Optional<InventarioBodega> findByProductoIdAndBodegaId(Long productoId, Long bodegaId);

    @Query("SELECT COALESCE(SUM(inv.stock), 0) FROM InventarioBodega inv WHERE inv.producto.id = :productoId")
    Integer sumStockByProductoId(@Param("productoId") Long productoId);

    @Query("SELECT COALESCE(SUM(inv.stock), 0) FROM InventarioBodega inv WHERE inv.bodega.id = :bodegaId")
    Integer sumStockByBodegaId(@Param("bodegaId") Long bodegaId);

    List<InventarioBodega> findByProductoIdIn(List<Long> productoIds);
}
```

---

## 7. Actualizar ProductoService y ProductoServiceImpl

### 7.1 Archivo: `src/main/java/com/logitrack/service/ProductoService.java`

**Agregar métodos nuevos al final de la interfaz:**

```java
Producto guardarConInventario(Producto producto, Map<Long, Integer> stockPorBodega);

Producto actualizarConInventario(Long id, Producto producto, Map<Long, Integer> stockPorBodega);

List<ProductoConInventarioDTO> obtenerTodosConInventario();

ProductoConInventarioDTO obtenerConInventarioPorId(Long id);
```

**NO OLVIDAR agregar el import:**
```java
import com.logitrack.dto.ProductoConInventarioDTO;
import java.util.Map;
```

### 7.2 Archivo: `src/main/java/com/logitrack/service/ProductoServiceImpl.java`

**Agregar dependencia en el constructor:**

```java
private final InventarioBodegaRepository inventarioBodegaRepository;
private final BodegaRepository bodegaRepository;

public ProductoServiceImpl(ProductoRepository productoRepository,
                           InventarioBodegaRepository inventarioBodegaRepository,
                           BodegaRepository bodegaRepository) {
    this.productoRepository = productoRepository;
    this.inventarioBodegaRepository = inventarioBodegaRepository;
    this.bodegaRepository = bodegaRepository;
}
```

**MODIFICAR el método `guardar()`:**

```java
@Override
@Transactional
public Producto guardar(Producto producto) {
    // El stock total del producto es 0 hasta que se asigne por bodega
    producto.setStock(0);
    return productoRepository.save(producto);
}
```

**AGREGAR método `guardarConInventario()`:**

```java
@Override
@Transactional
public Producto guardarConInventario(Producto producto, Map<Long, Integer> stockPorBodega) {
    // Guardar el producto primero con stock 0 (se recalculará)
    int stockTotal = 0;
    producto.setStock(0);
    Producto saved = productoRepository.save(producto);

    if (stockPorBodega != null && !stockPorBodega.isEmpty()) {
        for (Map.Entry<Long, Integer> entry : stockPorBodega.entrySet()) {
            Long bodegaId = entry.getKey();
            Integer cantidad = entry.getValue();

            if (cantidad == null || cantidad <= 0) continue;

            Bodega bodega = bodegaRepository.findById(bodegaId)
                    .orElseThrow(() -> new ResourceNotFoundException("Bodega", "id", bodegaId));

            InventarioBodega inventario = InventarioBodega.builder()
                    .producto(saved)
                    .bodega(bodega)
                    .stock(cantidad)
                    .build();
            inventarioBodegaRepository.save(inventario);

            stockTotal += cantidad;
        }
    }

    // Actualizar el stock total del producto
    saved.setStock(stockTotal);
    return productoRepository.save(saved);
}
```

**MODIFICAR método `actualizar()`:**

```java
@Override
@Transactional
public Producto actualizar(Long id, Producto producto) {
    Producto productoExistente = obtenerPorId(id);

    productoExistente.setNombre(producto.getNombre());
    productoExistente.setCategoria(producto.getCategoria());
    productoExistente.setPrecio(producto.getPrecio());
    // NO actualizar stock total aquí, se actualiza vía inventarios

    return productoRepository.save(productoExistente);
}
```

**AGREGAR método `actualizarConInventario()`:**

```java
@Override
@Transactional
public Producto actualizarConInventario(Long id, Producto producto, Map<Long, Integer> stockPorBodega) {
    Producto productoExistente = obtenerPorId(id);

    productoExistente.setNombre(producto.getNombre());
    productoExistente.setCategoria(producto.getCategoria());
    productoExistente.setPrecio(producto.getPrecio());

    // Limpiar inventarios existentes
    List<InventarioBodega> inventariosExistentes = inventarioBodegaRepository.findByProductoId(id);
    inventarioBodegaRepository.deleteAll(inventariosExistentes);

    // Re-crear inventarios
    int stockTotal = 0;
    if (stockPorBodega != null && !stockPorBodega.isEmpty()) {
        for (Map.Entry<Long, Integer> entry : stockPorBodega.entrySet()) {
            Long bodegaId = entry.getKey();
            Integer cantidad = entry.getValue();

            if (cantidad == null || cantidad <= 0) continue;

            Bodega bodega = bodegaRepository.findById(bodegaId)
                    .orElseThrow(() -> new ResourceNotFoundException("Bodega", "id", bodegaId));

            InventarioBodega inventario = InventarioBodega.builder()
                    .producto(productoExistente)
                    .bodega(bodega)
                    .stock(cantidad)
                    .build();
            inventarioBodegaRepository.save(inventario);

            stockTotal += cantidad;
        }
    }

    productoExistente.setStock(stockTotal);
    return productoRepository.save(productoExistente);
}
```

**AGREGAR método `obtenerTodosConInventario()`:**

```java
@Override
public List<ProductoConInventarioDTO> obtenerTodosConInventario() {
    List<Producto> productos = productoRepository.findAll();
    List<Long> productoIds = productos.stream().map(Producto::getId).toList();
    List<InventarioBodega> todosInventarios = inventarioBodegaRepository.findByProductoIdIn(productoIds);

    Map<Long, List<InventarioBodega>> inventarioMap = todosInventarios.stream()
            .collect(Collectors.groupingBy(inv -> inv.getProducto().getId()));

    return productos.stream()
            .map(p -> ProductoConInventarioDTO.fromProducto(p, 
                    inventarioMap.getOrDefault(p.getId(), List.of())))
            .toList();
}
```

**AGREGAR método `obtenerConInventarioPorId()`:**

```java
@Override
public ProductoConInventarioDTO obtenerConInventarioPorId(Long id) {
    Producto producto = obtenerPorId(id);
    List<InventarioBodega> inventarios = inventarioBodegaRepository.findByProductoId(id);
    return ProductoConInventarioDTO.fromProducto(producto, inventarios);
}
```

**IMPORT necesario que NO OLVIDAR:**
```java
import com.logitrack.model.InventarioBodega;
import com.logitrack.repository.InventarioBodegaRepository;
import com.logitrack.repository.BodegaRepository;
import com.logitrack.dto.ProductoConInventarioDTO;
import java.util.Map;
import java.util.stream.Collectors;
```

---

## 8. Actualizar ProductoController

### Archivo: `src/main/java/com/logitrack/controller/ProductoController.java`

#### 8.1 Crear un DTO interno para la petición POST/PUT con distribución:

**Agregar nuevo import:**
```java
import com.logitrack.dto.ProductoConInventarioDTO;
import java.util.Map;
```

#### 8.2 Crear un record/clase estática para el request body. Agregar al final del archivo (antes del `}` final):

```java
// Clase auxiliar para recibir producto + distribución de stock por bodega
record ProductoRequest(
    Producto producto,
    Map<Long, Integer> stockPorBodega  // bodegaId -> cantidad
) {}
```

**NOTA**: Si tu versión de Java no soporta `record`, usa esta clase tradicional:

```java
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
static class ProductoRequest {
    private Producto producto;
    private Map<Long, Integer> stockPorBodega;
}
```

Y agregar imports:
```java
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
```

#### 8.3 Agregar endpoint GET con inventario:

```java
@GetMapping("/con-inventario")
public ResponseEntity<List<ProductoConInventarioDTO>> obtenerTodosConInventario() {
    return ResponseEntity.ok(productoService.obtenerTodosConInventario());
}

@GetMapping("/{id}/con-inventario")
public ResponseEntity<ProductoConInventarioDTO> obtenerConInventarioPorId(@PathVariable Long id) {
    return ResponseEntity.ok(productoService.obtenerConInventarioPorId(id));
}
```

#### 8.4 MODIFICAR el método `crear()`:

```java
@PostMapping
public ResponseEntity<Producto> crear(@Valid @RequestBody Producto producto) {
    return new ResponseEntity<>(productoService.guardar(producto), HttpStatus.CREATED);
}
```

Se mantiene igual para compatibilidad, pero se agrega:

```java
@PostMapping("/con-inventario")
public ResponseEntity<Producto> crearConInventario(@Valid @RequestBody ProductoRequest request) {
    return new ResponseEntity<>(
        productoService.guardarConInventario(request.producto(), request.stockPorBodega()),
        HttpStatus.CREATED
    );
}
```

#### 8.5 MODIFICAR el método `actualizar()`:

```java
@PutMapping("/{id}")
public ResponseEntity<Producto> actualizar(@PathVariable Long id, @Valid @RequestBody Producto producto) {
    return ResponseEntity.ok(productoService.actualizar(id, producto));
}
```

Se mantiene igual, pero se agrega:

```java
@PutMapping("/{id}/con-inventario")
public ResponseEntity<Producto> actualizarConInventario(@PathVariable Long id, @Valid @RequestBody ProductoRequest request) {
    return ResponseEntity.ok(
        productoService.actualizarConInventario(id, request.producto(), request.stockPorBodega())
    );
}
```

---

## 9. Actualizar schema.sql

### Archivo: `src/main/resources/schema.sql`

**Agregar después de la tabla `auditorias`:**

```sql
-- Tabla: inventario_bodega (stock de cada producto por bodega)
CREATE TABLE IF NOT EXISTS inventario_bodega (
    id BIGSERIAL PRIMARY KEY,
    producto_id BIGINT NOT NULL,
    bodega_id BIGINT NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    FOREIGN KEY (bodega_id) REFERENCES bodegas(id) ON DELETE CASCADE,
    UNIQUE (producto_id, bodega_id)
);
```

---

## 10. Actualizar MovimientoInventarioServiceImpl (stock x bodega)

### Archivo: `src/main/java/com/logitrack/service/MovimientoInventarioServiceImpl.java`

### 10.1 Agregar dependencia:

```java
private final InventarioBodegaRepository inventarioBodegaRepository;

public MovimientoInventarioServiceImpl(MovimientoInventarioRepository movimientoRepository,
                                        ProductoRepository productoRepository,
                                        BodegaRepository bodegaRepository,
                                        UsuarioRepository usuarioRepository,
                                        InventarioBodegaRepository inventarioBodegaRepository) {
    this.movimientoRepository = movimientoRepository;
    this.productoRepository = productoRepository;
    this.bodegaRepository = bodegaRepository;
    this.usuarioRepository = usuarioRepository;
    this.inventarioBodegaRepository = inventarioBodegaRepository;
}
```

**Agregar import:**
```java
import com.logitrack.model.InventarioBodega;
import com.logitrack.repository.InventarioBodegaRepository;
```

### 10.2 MODIFICAR método `registrarMovimiento()` para usar stock por bodega:

**BLOQUE A REEMPLAZAR (el bloque de procesamiento de cambios de stock dentro del método):**

```java
// Procesar cambios de stock en productos
for (MovimientoDetalle detalle : movimiento.getDetalles()) {
    detalle.setMovimiento(movimiento);
    Producto producto = productoRepository.findById(detalle.getProducto().getId())
            .orElseThrow(() -> new ResourceNotFoundException("Producto", "id", detalle.getProducto().getId()));

    if (movimiento.getTipoMovimiento() == TipoMovimiento.SALIDA ||
        movimiento.getTipoMovimiento() == TipoMovimiento.TRANSFERENCIA) {
        if (producto.getStock() < detalle.getCantidad()) {
            throw new BadRequestException(String.format("Stock insuficiente para el producto '%s'. Stock actual: %d, Solicitado: %d",
                    producto.getNombre(), producto.getStock(), detalle.getCantidad()));
        }
        producto.setStock(producto.getStock() - detalle.getCantidad());
    }

    if (movimiento.getTipoMovimiento() == TipoMovimiento.ENTRADA) {
        producto.setStock(producto.getStock() + detalle.getCantidad());
    }

    productoRepository.save(producto);
    detalle.setProducto(producto);
}
```

**REEMPLAZAR POR:**

```java
// Procesar cambios de stock en productos y en inventario_bodega
for (MovimientoDetalle detalle : movimiento.getDetalles()) {
    detalle.setMovimiento(movimiento);
    Producto producto = productoRepository.findById(detalle.getProducto().getId())
            .orElseThrow(() -> new ResourceNotFoundException("Producto", "id", detalle.getProducto().getId()));

    if (movimiento.getTipoMovimiento() == TipoMovimiento.SALIDA) {
        // SALIDA: disminuir stock de bodega_origen
        if (movimiento.getBodegaOrigen() == null) {
            throw new BadRequestException("Para SALIDA se requiere bodega de origen.");
        }
        InventarioBodega invOrigen = inventarioBodegaRepository
                .findByProductoIdAndBodegaId(producto.getId(), movimiento.getBodegaOrigen().getId())
                .orElseThrow(() -> new BadRequestException(String.format(
                        "El producto '%s' no tiene inventario registrado en la bodega '%s'.",
                        producto.getNombre(), movimiento.getBodegaOrigen().getNombre())));

        if (invOrigen.getStock() < detalle.getCantidad()) {
            throw new BadRequestException(String.format(
                    "Stock insuficiente en bodega '%s' para el producto '%s'. Stock en bodega: %d, Solicitado: %d",
                    movimiento.getBodegaOrigen().getNombre(), producto.getNombre(),
                    invOrigen.getStock(), detalle.getCantidad()));
        }

        invOrigen.setStock(invOrigen.getStock() - detalle.getCantidad());
        inventarioBodegaRepository.save(invOrigen);
        producto.setStock(producto.getStock() - detalle.getCantidad());

    } else if (movimiento.getTipoMovimiento() == TipoMovimiento.ENTRADA) {
        // ENTRADA: aumentar stock de bodega_destino
        if (movimiento.getBodegaDestino() == null) {
            throw new BadRequestException("Para ENTRADA se requiere bodega de destino.");
        }
        InventarioBodega invDestino = inventarioBodegaRepository
                .findByProductoIdAndBodegaId(producto.getId(), movimiento.getBodegaDestino().getId())
                .orElseGet(() -> InventarioBodega.builder()
                        .producto(producto)
                        .bodega(movimiento.getBodegaDestino())
                        .stock(0)
                        .build());

        invDestino.setStock(invDestino.getStock() + detalle.getCantidad());
        inventarioBodegaRepository.save(invDestino);
        producto.setStock(producto.getStock() + detalle.getCantidad());

    } else if (movimiento.getTipoMovimiento() == TipoMovimiento.TRANSFERENCIA) {
        // TRANSFERENCIA: disminuir de origen, aumentar en destino
        if (movimiento.getBodegaOrigen() == null || movimiento.getBodegaDestino() == null) {
            throw new BadRequestException("Para TRANSFERENCIA se requieren bodega origen y destino.");
        }

        InventarioBodega invOrigen = inventarioBodegaRepository
                .findByProductoIdAndBodegaId(producto.getId(), movimiento.getBodegaOrigen().getId())
                .orElseThrow(() -> new BadRequestException(String.format(
                        "El producto '%s' no tiene inventario en la bodega origen '%s'.",
                        producto.getNombre(), movimiento.getBodegaOrigen().getNombre())));

        if (invOrigen.getStock() < detalle.getCantidad()) {
            throw new BadRequestException(String.format(
                    "Stock insuficiente en bodega '%s' para transferir. Stock: %d, Solicitado: %d",
                    movimiento.getBodegaOrigen().getNombre(), invOrigen.getStock(), detalle.getCantidad()));
        }

        invOrigen.setStock(invOrigen.getStock() - detalle.getCantidad());
        inventarioBodegaRepository.save(invOrigen);

        InventarioBodega invDestino = inventarioBodegaRepository
                .findByProductoIdAndBodegaId(producto.getId(), movimiento.getBodegaDestino().getId())
                .orElseGet(() -> InventarioBodega.builder()
                        .producto(producto)
                        .bodega(movimiento.getBodegaDestino())
                        .stock(0)
                        .build());

        invDestino.setStock(invDestino.getStock() + detalle.getCantidad());
        inventarioBodegaRepository.save(invDestino);
    }

    productoRepository.save(producto);
    detalle.setProducto(producto);
}
```

---

## 11. Actualizar ReporteServiceImpl

### Archivo: `src/main/java/com/logitrack/service/ReporteServiceImpl.java`

### 11.1 Agregar dependencia:

```java
import com.logitrack.repository.InventarioBodegaRepository;

// En el constructor:
private final InventarioBodegaRepository inventarioBodegaRepository;

public ReporteServiceImpl(BodegaRepository bodegaRepository,
                           ProductoRepository productoRepository,
                           MovimientoInventarioRepository movimientoRepository,
                           InventarioBodegaRepository inventarioBodegaRepository) {
    this.bodegaRepository = bodegaRepository;
    this.productoRepository = productoRepository;
    this.movimientoRepository = movimientoRepository;
    this.inventarioBodegaRepository = inventarioBodegaRepository;
}
```

### 11.2 MODIFICAR el cálculo de stockPorBodega en obtenerResumenGeneral:

**BLOQUE A REEMPLAZAR:**

```java
Map<Long, StockPorBodegaDTO> stockPorBodegaMap = bodegaRepository.findAll().stream()
        .collect(Collectors.toMap(Bodega::getId,
                b -> StockPorBodegaDTO.builder()
                        .bodegaNombre(b.getNombre())
                        .stockTotal(0L)
                        .build()));

for (MovimientoInventario movimiento : movimientosParaStock) {
    if (movimiento.getDetalles() == null) continue;

    for (MovimientoDetalle detalle : movimiento.getDetalles()) {
        if (movimiento.getBodegaOrigen() != null && (movimiento.getTipoMovimiento() == TipoMovimiento.SALIDA || movimiento.getTipoMovimiento() == TipoMovimiento.TRANSFERENCIA)) {
            StockPorBodegaDTO origen = stockPorBodegaMap.get(movimiento.getBodegaOrigen().getId());
            if (origen != null) {
                origen.setStockTotal(origen.getStockTotal() - detalle.getCantidad());
            }
        }
        if (movimiento.getBodegaDestino() != null && (movimiento.getTipoMovimiento() == TipoMovimiento.ENTRADA || movimiento.getTipoMovimiento() == TipoMovimiento.TRANSFERENCIA)) {
            StockPorBodegaDTO destino = stockPorBodegaMap.get(movimiento.getBodegaDestino().getId());
            if (destino != null) {
                destino.setStockTotal(destino.getStockTotal() + detalle.getCantidad());
            }
        }
    }
}
```

**REEMPLAZAR POR:**

```java
// Obtener stock real desde inventario_bodega
List<Bodega> bodegas = bodegaRepository.findAll();
Map<Long, StockPorBodegaDTO> stockPorBodegaMap = new HashMap<>();

for (Bodega bodega : bodegas) {
    Integer stockTotal = inventarioBodegaRepository.sumStockByBodegaId(bodega.getId());
    stockPorBodegaMap.put(bodega.getId(), StockPorBodegaDTO.builder()
            .bodegaId(bodega.getId())
            .bodegaNombre(bodega.getNombre())
            .stockTotal(stockTotal != null ? stockTotal.longValue() : 0L)
            .build());
}
```

---

## 12. Corregir frontend: modal de producto con distribución por bodega

### Archivo: `src/main/resources/static/html/productos.html`

### 12.1 MODIFICAR el modal de producto para incluir distribución por bodega:

Buscar el bloque:

```html
<div class="form-grid-2">
    <div class="form-group">
        <label class="form-label" for="product-stock">Stock</label>
        <input class="form-input form-input--mono" id="product-stock" name="stock" type="number" min="0" placeholder="0" required>
    </div>
    <div class="form-group">
        <label class="form-label" for="product-precio">Precio</label>
        <div class="input-prefix">
            <span class="input-prefix__symbol">$</span>
            <input class="form-input form-input--mono" id="product-precio" name="precio" type="number" min="0" step="0.01" placeholder="0.00" required>
        </div>
    </div>
</div>
```

**REEMPLAZAR POR:**

```html
<div class="form-grid-2">
    <div class="form-group">
        <label class="form-label" for="product-precio">Precio</label>
        <div class="input-prefix">
            <span class="input-prefix__symbol">$</span>
            <input class="form-input form-input--mono" id="product-precio" name="precio" type="number" min="0" step="0.01" placeholder="0.00" required>
        </div>
    </div>
</div>

<!-- Distribución de Stock por Bodega -->
<div class="form-group">
    <label class="form-label">Distribución de Stock por Bodega</label>
    <div id="stock-distribucion-container">
        <!-- Las bodegas se cargarán dinámicamente desde JS -->
        <p class="cell-muted" id="stock-distribucion-loading">Cargando bodegas...</p>
    </div>
    <small class="form-help-text">Asigna el stock inicial de este producto a una o más bodegas.</small>
</div>

<!-- Stock total (calculado automáticamente) -->
<div class="form-group">
    <label class="form-label">Stock Total</label>
    <input class="form-input form-input--mono" id="product-stock-total" type="text" value="0" readonly disabled>
</div>
```

### 12.2 MODIFICAR el form para quitar el campo stock individual:

En el formulario modal, el campo `name="stock"` ya no se envía directamente (se calcula desde distribución). Se puede dejar pero oculto, o mejor, quitarlo del `form.elements` que se serializan.

---

### 12.3 MODIFICAR `script.js` para manejar la distribución de stock:

**Agregar función para cargar bodegas en el modal de producto:**

```javascript
async function cargarBodegasParaDistribucion(productoId) {
    const container = document.getElementById('stock-distribucion-container');
    if (!container) return;

    try {
        const bodegas = await apiFetch('/api/bodegas');
        let inventarios = [];

        // Si estamos editando, cargar inventario actual
        if (productoId) {
            try {
                const productoConInv = await apiFetch(`/api/productos/${productoId}/con-inventario`);
                inventarios = productoConInv.distribucionStock || [];
            } catch(e) { /* ignorar */ }
        }

        container.innerHTML = bodegas.map(b => {
            const inv = inventarios.find(i => i.bodegaId === b.id);
            const cantidad = inv ? inv.stockTotal : 0;
            return `
                <div class="form-grid-2" style="margin-bottom: 8px; align-items: center;">
                    <label class="form-label" style="margin:0; font-weight:500;">${b.nombre}</label>
                    <input class="form-input form-input--mono stock-bodega-input" 
                           type="number" min="0" value="${cantidad}" 
                           data-bodega-id="${b.id}" data-bodega-nombre="${b.nombre}"
                           placeholder="Stock en ${b.nombre}">
                </div>
            `;
        }).join('');

        // Calcular stock total automáticamente
        container.querySelectorAll('.stock-bodega-input').forEach(input => {
            input.addEventListener('input', calcularStockTotalDistribucion);
        });
        calcularStockTotalDistribucion();

    } catch (err) {
        container.innerHTML = '<p class="cell-muted">Error al cargar bodegas: ' + err.message + '</p>';
    }
}

function calcularStockTotalDistribucion() {
    const totalInput = document.getElementById('product-stock-total');
    if (!totalInput) return;
    const inputs = document.querySelectorAll('.stock-bodega-input');
    let total = 0;
    inputs.forEach(input => {
        total += Number(input.value) || 0;
    });
    totalInput.value = total;
}
```

### 12.4 MODIFICAR `abrirProductoModal()` en `script.js`:

**BLOQUE A REEMPLAZAR:**
```javascript
function abrirProductoModal(mode, data) {
    const form = document.getElementById('product-form');
    if (!form) return;
    form.reset();
    document.getElementById('product-modal-title').textContent =
        mode === 'edit' ? 'Editar Producto' : 'Nuevo Producto';
    if (data) {
        form.elements.nombre.value = data.name || '';
        form.elements.categoria.value = data.category || '';
        form.elements.stock.value = data.stock || '';
        form.elements.precio.value = data.price || '';
    }
    document.getElementById('product-modal-backdrop')?.classList.add('is-open');
}
```

**REEMPLAZAR POR:**
```javascript
function abrirProductoModal(mode, data) {
    const form = document.getElementById('product-form');
    if (!form) return;
    form.reset();
    document.getElementById('product-modal-title').textContent =
        mode === 'edit' ? 'Editar Producto' : 'Nuevo Producto';
    if (data) {
        form.elements.nombre.value = data.name || '';
        form.elements.categoria.value = data.category || '';
        form.elements.precio.value = data.price || '';
    }
    document.getElementById('product-modal-backdrop')?.classList.add('is-open');

    // Cargar bodegas para distribución de stock
    const productoId = mode === 'edit' ? data?.id : null;
    cargarBodegasParaDistribucion(productoId);
}
```

### 12.5 MODIFICAR el submit del formulario de producto en `script.js`:

**BLOQUE A REEMPLAZAR (el event listener de `#product-form`):**
```javascript
document.getElementById('product-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    const payload = {
        nombre: form.elements.nombre.value,
        categoria: form.elements.categoria.value,
        stock: Number(form.elements.stock.value),
        precio: Number(form.elements.precio.value),
    };
    try {
        if (productoIdEditando) {
            await apiFetch(`/api/productos/${productoIdEditando}`, { method: 'PUT', body: JSON.stringify(payload) });
        } else {
            await apiFetch('/api/productos', { method: 'POST', body: JSON.stringify(payload) });
        }
        document.getElementById('product-modal-backdrop')?.classList.remove('is-open');
        productoIdEditando = null;
        cargarProductos();
    } catch (err) {
        alert(err.message);
    }
});
```

**REEMPLAZAR POR:**
```javascript
document.getElementById('product-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    const payload = {
        nombre: form.elements.nombre.value,
        categoria: form.elements.categoria.value,
        stock: 0, // Se recalculará en backend
        precio: Number(form.elements.precio.value),
    };

    // Obtener distribución de stock por bodega
    const stockPorBodega = {};
    document.querySelectorAll('.stock-bodega-input').forEach(input => {
        const cantidad = Number(input.value) || 0;
        if (cantidad > 0) {
            stockPorBodega[input.dataset.bodegaId] = cantidad;
        }
    });

    try {
        if (productoIdEditando) {
            await apiFetch(`/api/productos/${productoIdEditando}/con-inventario`, {
                method: 'PUT',
                body: JSON.stringify({ producto: payload, stockPorBodega })
            });
        } else {
            await apiFetch('/api/productos/con-inventario', {
                method: 'POST',
                body: JSON.stringify({ producto: payload, stockPorBodega })
            });
        }
        document.getElementById('product-modal-backdrop')?.classList.remove('is-open');
        productoIdEditando = null;
        cargarProductos();
    } catch (err) {
        alert(err.message);
    }
});
```

---

## 13. Corregir frontend: formulario de movimiento

**NOTA IMPORTANTE**: El formulario de movimiento YA FUNCIONA correctamente. Muestra:
- **ENTRADA**: solo campo Bodega Destino
- **SALIDA**: solo campo Bodega Origen
- **TRANSFERENCIA**: ambos campos

La validación existe en el backend y en el frontend está implementada correctamente en `initNuevoMovimientoReal()`.

**Sin embargo**, se debe actualizar el movimiento para que en vez de modificar el stock global del producto, modifique el `inventario_bodega` (esto se hizo en el paso 10).

---

## 14. Secuencia de Implementación

Para implementar TODO correctamente, sigue este orden:

```
PASO 1  → Corregir pom.xml (dependencias inválidas)
PASO 2  → Crear la entidad InventarioBodega.java
PASO 3  → Crear el repositorio InventarioBodegaRepository.java
PASO 4  → Actualizar schema.sql con la nueva tabla
PASO 5  → Modificar StockPorBodegaDTO.java (agregar bodegaId)
PASO 6  → Crear ProductoConInventarioDTO.java
PASO 7  → Actualizar ProductoServiceImpl.java
PASO 8  → Actualizar ProductoService.java
PASO 9  → Actualizar ProductoController.java
PASO 10 → Actualizar MovimientoInventarioServiceImpl.java
PASO 11 → Actualizar ReporteServiceImpl.java
PASO 12 → Actualizar AuthController.java
PASO 13 → Actualizar GlobalExceptionHandler.java
PASO 14 → Actualizar productos.html (modal con distribución)
PASO 15 → Actualizar script.js (lógica de distribución)
```

---

## 📌 NOTA SOBRE EL REGISTRO DE USUARIO

El registro de usuario funciona **exclusivamente vía API REST** mediante Thunder Client, Postman o cualquier cliente HTTP. No hay ni es necesaria una página de registro en el frontend. Solo el ADMIN puede registrar usuarios.

### Request de ejemplo para Thunder Client:

```
POST http://localhost:8080/api/auth/register
Content-Type: application/json

{
    "username": "admin",
    "email": "admin@logitrack.com",
    "password": "admin123",
    "rol": "ADMIN"
}
```

### Para registrar un empleado:

```
POST http://localhost:8080/api/auth/register
Content-Type: application/json

{
    "username": "nuevo_empleado",
    "email": "empleado@logitrack.com",
    "password": "password123",
    "rol": "EMPLEADO"
}
```

### Endpoints disponibles para producto con inventario:

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/productos` | Todos los productos (stock total) |
| GET | `/api/productos/con-inventario` | Todos los productos con distribución por bodega |
| GET | `/api/productos/{id}/con-inventario` | Producto específico con distribución |
| POST | `/api/productos/con-inventario` | Crear producto con distribución de stock |
| PUT | `/api/productos/{id}/con-inventario` | Actualizar producto y su distribución |

### Ejemplo de creación de producto con distribución por bodegas:

```
POST http://localhost:8080/api/productos/con-inventario
Content-Type: application/json

{
    "producto": {
        "nombre": "Laptop Dell XPS 15",
        "categoria": "Electronica",
        "precio": 1500.00
    },
    "stockPorBodega": {
        "1": 10,
        "2": 5,
        "3": 3
    }
}
```

Esto asigna: 10 unidades en bodega ID=1, 5 en bodega ID=2, 3 en bodega ID=3.

---

## 🎯 RESUMEN DE ARCHIVOS CREADOS

| Archivo | Acción |
|---------|--------|
| `src/main/java/com/logitrack/model/InventarioBodega.java` | ✅ CREAR |
| `src/main/java/com/logitrack/dto/ProductoConInventarioDTO.java` | ✅ CREAR |
| `src/main/java/com/logitrack/repository/InventarioBodegaRepository.java` | ✅ CREAR |

## 🎯 RESUMEN DE ARCHIVOS MODIFICADOS

| Archivo | Acción |
|---------|--------|
| `pom.xml` | 🔧 MODIFICAR (2 dependencias) |
| `src/main/java/com/logitrack/controller/AuthController.java` | 🔧 MODIFICAR (login + register) |
| `src/main/java/com/logitrack/exception/GlobalExceptionHandler.java` | 🔧 MODIFICAR (nuevo handler) |
| `src/main/java/com/logitrack/dto/StockPorBodegaDTO.java` | 🔧 MODIFICAR (agregar bodegaId) |
| `src/main/java/com/logitrack/service/ProductoService.java` | 🔧 MODIFICAR (4 nuevos métodos) |
| `src/main/java/com/logitrack/service/ProductoServiceImpl.java` | 🔧 MODIFICAR (4 nuevos métodos + modificar existentes) |
| `src/main/java/com/logitrack/controller/ProductoController.java` | 🔧 MODIFICAR (nuevos endpoints) |
| `src/main/java/com/logitrack/service/MovimientoInventarioServiceImpl.java` | 🔧 MODIFICAR (stock por bodega) |
| `src/main/java/com/logitrack/service/ReporteServiceImpl.java` | 🔧 MODIFICAR (stock real desde inventario) |
| `src/main/resources/schema.sql` | 🔧 MODIFICAR (nueva tabla) |
| `src/main/resources/static/html/productos.html` | 🔧 MODIFICAR (modal con distribución) |
| `src/main/resources/static/js/script.js` | 🔧 MODIFICAR (lógica de distribución + submit) |

---

*Manual generado el 2025. Para soporte adicional, contacta al administrador del sistema.*

