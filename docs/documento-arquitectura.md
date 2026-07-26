# Documento de Arquitectura - LogiTrack WMS

> **Proyecto:** Sistema de Gestión y Auditoría de Bodegas  
> **Empresa:** LogiTrack S.A.  
> **Versión:** 1.0  
> **Fecha:** 2025

---

## Índice

1. [Diagrama de Clases](#1-diagrama-de-clases)
2. [Descripción de la Arquitectura](#2-descripción-de-la-arquitectura)
3. [Ejemplo de Token JWT y Uso](#3-ejemplo-de-token-jwt-y-uso)

---

## 1. Diagrama de Clases

### 1.1 Modelo de Dominio (Entidades JPA)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MODELO DE DOMINIO                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────┐       ┌──────────────────────┐                   │
│  │       Usuario        │       │       Bodega         │                   │
│  ├──────────────────────┤       ├──────────────────────┤                   │
│  │ - id: Long           │       │ - id: Long           │                   │
│  │ - username: String   │       │ - nombre: String     │                   │
│  │ - email: String      │◄──────│ - ubicacion: String  │                   │
│  │ - password: String   │  FK   │ - capacidad: Integer │                   │
│  │ - rol: Rol (enum)    │       │ - encargado: Usuario │                   │
│  └──────────┬───────────┘       └──────────┬───────────┘                   │
│             │                              │                               │
│             │ 1                         1  │                               │
│             │                              │                               │
│             │                              │                               │
│  ┌──────────▼───────────┐       ┌──────────▼───────────┐                   │
│  │  MovimientoInventario│       │  InventarioBodega    │                   │
│  ├──────────────────────┤       ├──────────────────────┤                   │
│  │ - id: Long           │       │ - id: Long           │                   │
│  │ - fecha: LocalDateTime│      │ - producto: Producto │                   │
│  │ - tipoMovimiento:    │       │ - bodega: Bodega     │                   │
│  │   TipoMovimiento(enum)│      │ - stock: Integer     │                   │
│  │ - usuario: Usuario   │       └──────────┬───────────┘                   │
│  │ - bodegaOrigen: Bodega│                 │                               │
│  │ - bodegaDestino: Bodega│                │                               │
│  │ - detalles: List<     │                 │                               │
│  │   MovimientoDetalle>  │                 │                               │
│  └──────────┬───────────┘                  │                               │
│             │ 1                            │                               │
│             │                              │                               │
│             │ *                            │                               │
│  ┌──────────▼───────────┐       ┌──────────▼───────────┐                   │
│  │  MovimientoDetalle   │       │      Producto        │                   │
│  ├──────────────────────┤       ├──────────────────────┤                   │
│  │ - id: Long           │       │ - id: Long           │                   │
│  │ - movimiento:        │       │ - nombre: String     │                   │
│  │   MovimientoInventario│      │ - categoria: String  │                   │
│  │ - producto: Producto │       │ - stock: Integer     │                   │
│  │ - cantidad: Integer  │       │ - precio: BigDecimal │                   │
│  └──────────────────────┘       └──────────────────────┘                   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                          Auditoria                                   │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │ - id: Long                                                          │  │
│  │ - tipoOperacion: TipoOperacion (enum: INSERT, UPDATE, DELETE)       │  │
│  │ - fechaHora: LocalDateTime                                          │  │
│  │ - usuario: Usuario                                                  │  │
│  │ - entidadAfectada: String                                           │  │
│  │ - entidadId: Long                                                   │  │
│  │ - valoresAnteriores: String (JSON)                                  │  │
│  │ - valoresNuevos: String (JSON)                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────┐    ┌──────────────────────┐                      │
│  │   Rol (enum)         │    │  TipoMovimiento (enum)│                     │
│  ├──────────────────────┤    ├──────────────────────┤                      │
│  │ ADMIN                │    │ ENTRADA              │                      │
│  │ EMPLEADO             │    │ SALIDA               │                      │
│  └──────────────────────┘    │ TRANSFERENCIA        │                      │
│                              └──────────────────────┘                      │
│                                                                             │
│  ┌──────────────────────┐                                                  │
│  │ TipoOperacion (enum) │                                                  │
│  ├──────────────────────┤                                                  │
│  │ INSERT               │                                                  │
│  │ UPDATE               │                                                  │
│  │ DELETE               │                                                  │
│  └──────────────────────┘                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Diagrama de Capas (Arquitectura en Capas)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENTE (Frontend)                                │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  HTML / CSS / JS (src/main/resources/static/)                       │  │
│  │  - index.html, dashboard.html, bodegas.html, productos.html,        │  │
│  │    movimientos.html, auditoria.html                                 │  │
│  │  - api.js (cliente HTTP para consumir API REST)                     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP (JSON)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CAPA DE PRESENTACIÓN (Controller)                    │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Controladores REST (@RestController)                               │  │
│  │                                                                      │  │
│  │  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐  │  │
│  │  │ AuthController    │  │ BodegaController  │  │ ProductoController│  │  │
│  │  │ /api/auth         │  │ /api/bodegas      │  │ /api/productos    │  │  │
│  │  └───────────────────┘  └───────────────────┘  └───────────────────┘  │  │
│  │  ┌──────────────────────────────┐   ┌──────────────────────────────┐  │  │
│  │  │ MovimientoInventario-        │   │ AuditoriaController          │  │  │
│  │  │ Controller                   │   │ (solo ADMIN)                 │  │  │
│  │  │ /api/movimientos             │   │ /api/auditorias              │  │  │
│  │  └──────────────────────────────┘   └──────────────────────────────┘  │  │
│  │  ┌──────────────────────────────┐   ┌──────────────────────────────┐  │  │
│  │  │ ReporteController            │   │ UsuarioController            │  │  │
│  │  │ /api/reportes                │   │ /api/usuarios                │  │  │
│  │  └──────────────────────────────┘   └──────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Intercepta antes del @RestController
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                  CAPA DE SEGURIDAD (Spring Security + JWT)                  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ JwtAuthenticationFilter (OncePerRequestFilter)                        │  │
│  │ - Extrae el token Bearer del header Authorization                     │  │
│  │ - Valida firma y expiracion con JwtTokenProvider                      │  │
│  │ - Setea el Authentication en SecurityContextHolder                    │  │
│  │ - Guarda el username en UserContext (ThreadLocal) para listeners JPA  │  │
│  │ SecurityConfig: reglas por rol (ADMIN / EMPLEADO) y rutas publicas    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Invocacion de metodos de negocio
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CAPA DE SERVICIO (Logica de Negocio)                     │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ BodegaService / ProductoService / MovimientoInventarioService         │  │
│  │ AuditoriaService / ReporteService                                     │  │
│  │ - Contienen las reglas de negocio (@Service, @Transactional)          │  │
│  │ - Validan stock disponible, capacidad de bodegas y tipo de movimiento │  │
│  │ - Disparan el guardado de auditoria (evento o guardado directo)       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Spring Data JPA
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│             CAPA DE PERSISTENCIA (Repository - Spring Data JPA)             │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ UsuarioRepository / BodegaRepository / ProductoRepository             │  │
│  │ MovimientoInventarioRepository / InventarioBodegaRepository           │  │
│  │ AuditoriaRepository                                                   │  │
│  │ - Interfaces que extienden JpaRepository<T, Long> (Spring Data JPA)   │  │
│  │ - Incluyen consultas derivadas y @Query (JPQL) para filtros avanzados │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ JDBC / SQL
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                BASE DE DATOS                                │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ PostgreSQL - esquema "proyecto"                                       │  │
│  │ Tablas: usuarios, bodegas, productos, movimientos,                    │  │
│  │ movimiento_detalles, inventario_bodega, auditorias                    │  │
│  │ - schema.sql / data.sql: creacion e inicializacion de datos de prueba │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

> **Nota:** por claridad se representa la Seguridad como una capa horizontal, pero
> en la ejecución real el `JwtAuthenticationFilter` se registra con
> `addFilterBefore(..., UsernamePasswordAuthenticationFilter.class)`, por lo que
> intercepta la petición **antes** de que el `DispatcherServlet` la entregue al
> `@RestController` correspondiente.

### 1.3 Flujo de Auditoría Automática (Event-Driven)

Este es el mecanismo que cumple el requisito de "auditoría automática mediante
Listeners de JPA" del enunciado. Se apoya en tres piezas que trabajan en cadena:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│         Operacion CRUD sobre una entidad (INSERT / UPDATE / DELETE)         │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │  Hibernate dispara el callback JPA
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             AuditEntityListener                             │
│                 (@PostPersist / @PostUpdate / @PostRemove)                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │  Arma un AuditoriaEvent (tipo, entidad,
                                        │  id, valores anteriores/nuevos, usuario)
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│           ApplicationEventPublisher.publishEvent(AuditoriaEvent)            │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │  Evento de Spring, desacoplado de la
                                        │  transaccion de negocio en curso
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AuditoriaEventListener                            │
│             (@TransactionalEventListener phase = AFTER_COMMIT)              │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │  Solo se ejecuta si la transaccion
                                        │  original hizo commit exitoso
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AuditoriaRepository.save(...)                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Tabla "auditorias" en PostgreSQL                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

**¿Por qué este diseño?**

- **`UserContext` (ThreadLocal) en lugar de solo `SecurityContextHolder`:**
  Hibernate instancia `AuditEntityListener` fuera del contenedor de Spring
  (no es un `@Component`), por lo que en ciertos escenarios el
  `SecurityContextHolder` puede no estar disponible. `JwtAuthenticationFilter`
  guarda el `username` autenticado en un `ThreadLocal` propio al inicio de la
  petición y lo limpia al finalizar, garantizando que el listener siempre
  pueda identificar quién hizo el cambio.
- **`@TransactionalEventListener(phase = AFTER_COMMIT)`:** si se guardara la
  auditoría dentro de la misma transacción de negocio y esta fallara y
  revirtiera (rollback), se perdería también el registro de auditoría (o peor,
  quedaría un registro de un cambio que nunca ocurrió). Publicar un evento y
  procesarlo *después* del commit garantiza que solo se audite lo que
  realmente quedó persistido.
- **Snapshot con `@PostLoad`:** para capturar los "valores anteriores" en un
  `UPDATE`, el listener guarda una foto (serializada a JSON) de la entidad en
  `@PostLoad` (cuando Hibernate la carga desde la base de datos) y la compara
  contra el estado final en `@PostUpdate`.

### 1.4 Relaciones y Cardinalidades Principales

| Entidad origen         | Relación            | Entidad destino     | Cardinalidad |
|-------------------------|---------------------|---------------------|:------------:|
| `Bodega`                | `encargado`         | `Usuario`           | N : 1        |
| `MovimientoInventario`   | `usuario`           | `Usuario`           | N : 1        |
| `MovimientoInventario`   | `bodegaOrigen`      | `Bodega`             | N : 1 (opcional) |
| `MovimientoInventario`   | `bodegaDestino`     | `Bodega`             | N : 1 (opcional) |
| `MovimientoInventario`   | `detalles`          | `MovimientoDetalle`  | 1 : N        |
| `MovimientoDetalle`      | `producto`          | `Producto`           | N : 1        |
| `InventarioBodega`       | `producto` / `bodega` | `Producto` / `Bodega` | N : 1 (cada una) |
| `Auditoria`              | `usuario`           | `Usuario`            | N : 1 (opcional) |

> `InventarioBodega` es la tabla que resuelve la relación N:N real entre
> `Producto` y `Bodega` (cuánto stock de cada producto hay en cada bodega),
> con una restricción `UNIQUE(producto_id, bodega_id)`. El campo `stock` en
> `Producto` se mantiene como una suma denormalizada para consultas rápidas
> (por ejemplo, el reporte de stock bajo).

---

## 2. Descripción de la Arquitectura

### 2.1 Patrón Arquitectónico

LogiTrack WMS implementa una **arquitectura en capas (Layered Architecture)**
sobre **Spring Boot**, siguiendo el patrón **REST API + SPA ligera**:

- El backend expone una API REST sin estado (`stateless`), documentada con
  OpenAPI/Swagger.
- El frontend (`src/main/resources/static/`) es una aplicación de páginas
  múltiples en HTML/CSS/JS puro que consume esa API mediante `fetch` (ver
  `api.js`), sin frameworks de frontend.
- La autenticación es 100% vía **JWT**: no se usan sesiones HTTP
  (`SessionCreationPolicy.STATELESS`), por lo que cada petición debe incluir
  su propio token.

### 2.2 Responsabilidad de cada Capa

| Capa | Paquete | Responsabilidad |
|------|---------|------------------|
| **Controller** | `com.logitrack.controller` | Recibe peticiones HTTP, valida el cuerpo con `@Valid` y delega en la capa de Servicio. No contiene lógica de negocio. |
| **Security** | `com.logitrack.security` | Emisión/validación de JWT (`JwtTokenProvider`) y filtro de autenticación (`JwtAuthenticationFilter`). |
| **Service** | `com.logitrack.service` | Lógica de negocio: validaciones de stock/capacidad, orquestación de movimientos entre bodegas, generación de reportes. Define contratos por interfaz (`ProductoService`, `BodegaService`, etc.) con su implementación (`*ServiceImpl`). |
| **Repository** | `com.logitrack.repository` | Acceso a datos vía Spring Data JPA. Consultas derivadas por nombre de método y `@Query` (JPQL) para filtros avanzados (rango de fechas, stock bajo, por usuario, etc.). |
| **Model** | `com.logitrack.model` | Entidades JPA (`@Entity`) y enums del dominio (`Rol`, `TipoMovimiento`, `TipoOperacion`). |
| **DTO** | `com.logitrack.dto` | Objetos de transferencia para requests/responses que no deben exponer directamente las entidades (`LoginRequest`, `AuthResponse`, `ResumenReporteDTO`, etc.). |
| **Config** | `com.logitrack.config` | Configuración transversal: `WebConfig`, `OpenApiConfig`, `SpringContext` (acceso al `ApplicationContext` desde clases no gestionadas por Spring) y `UserContext` (ThreadLocal del usuario autenticado). |
| **Exception** | `com.logitrack.exception` | Excepciones de negocio (`ResourceNotFoundException`, `BadRequestException`) y manejo global (`GlobalExceptionHandler`). |
| **Listener** | `com.logitrack.listener` | Auditoría automática basada en eventos (`AuditEntityListener`, `AuditoriaEvent`, `AuditoriaEventListener`). |

### 2.3 Seguridad y Control de Acceso

La configuración vive en `SecurityConfig` (`@EnableWebSecurity` +
`@EnableMethodSecurity`) y combina reglas por ruta con anotaciones
`@PreAuthorize` a nivel de método:

| Recurso | GET | POST | DELETE |
|---|:---:|:---:|:---:|
| `/api/auth/login`, `/api/auth/register` | público | público | — |
| `/api/auth/register-empleado` | — | solo `ADMIN` | — |
| `/api/bodegas/**` | `ADMIN`, `EMPLEADO` | solo `ADMIN` | solo `ADMIN` |
| `/api/productos/**` | `ADMIN`, `EMPLEADO` | `ADMIN`, `EMPLEADO` | solo `ADMIN` |
| `/api/movimientos/**` | autenticado | autenticado | — |
| `/api/auditorias/**` | solo `ADMIN` | — | — |

Puntos clave de la implementación:

- Contraseñas cifradas con **BCrypt** (`BCryptPasswordEncoder`).
- Sesiones **stateless**: no hay `HttpSession`, toda la identidad viaja en el
  JWT de cada petición.
- `CSRF` deshabilitado (no aplica a una API sin sesiones ni formularios
  renderizados por el servidor).
- Recursos estáticos (`/`, `/html/**`, `/css/**`, `/js/**`) y Swagger UI son
  públicos; el resto de `/api/**` requiere autenticación por defecto.

### 2.4 Manejo de Excepciones

`GlobalExceptionHandler` (`@RestControllerAdvice`) centraliza las respuestas
de error en un formato JSON consistente (`timestamp`, `status`, `error`,
`message` / `errors`):

| Excepción | HTTP Status |
|---|:---:|
| `ResourceNotFoundException` | 404 |
| `BadRequestException` | 400 |
| `MethodArgumentNotValidException` (Bean Validation) | 400 |
| `AccessDeniedException` | 403 |
| `AuthenticationException` | 401 |
| `Exception` (genérica) | 500 |

### 2.5 Documentación de la API

La API se documenta automáticamente con **springdoc-openapi**
(`OpenApiConfig`), exponiendo:

- `GET /v3/api-docs` → especificación OpenAPI 3 en JSON.
- `GET /swagger-ui.html` → interfaz interactiva Swagger UI, con el esquema
  de seguridad `bearerAuth` (HTTP Bearer, formato JWT) ya configurado para
  poder probar los endpoints protegidos desde el propio navegador.

### 2.6 Frontend

El frontend en `src/main/resources/static/` es HTML/CSS/JS sin build step:

- `index.html` — login.
- `html/dashboard.html` — KPIs y gráfico de stock por bodega.
- `html/bodegas.html`, `html/productos.html`, `html/movimientos.html`,
  `html/auditoria.html` — CRUD y consultas por módulo.
- `js/api.js` — cliente HTTP central (`apiFetch`) que adjunta el header
  `Authorization: Bearer <token>`, maneja `401`/`403` y protege rutas según
  el rol del usuario guardado en `localStorage`.
- `js/script.js` — lógica de cada pantalla (paginación, filtros, modales).

---

## 3. Ejemplo de Token JWT y Uso

### 3.1 Estructura del Token

Un JWT consta de tres partes separadas por `.`, cada una codificada en
Base64URL: `HEADER.PAYLOAD.SIGNATURE`. En LogiTrack se genera en
`JwtTokenProvider.generateToken(Authentication)` usando el algoritmo
**HS256** y la clave configurada en `application.properties`
(`jwt.secret`, `jwt.expiration-ms=86400000` → 24 horas).

**Ejemplo ilustrativo de token** (valores de ejemplo, no funcional):

```
eyJhbGciOiJIUzI1NiJ9.
eyJzdWIiOiJhZG1pbiIsImlhdCI6MTc1MzQ0MDAwMCwiZXhwIjoxNzUzNTI2NDAwfQ.
4f2a9c7e1b3d6f8a0c5e2b9d7f1a3c6e8b0d2f4a6c8e0b2d4f6a8c0e2b4d6f8a
```

**Header decodificado:**

```json
{
  "alg": "HS256"
}
```

**Payload decodificado:**

```json
{
  "sub": "admin",
  "iat": 1753440000,
  "exp": 1753526400
}
```

| Claim | Significado |
|---|---|
| `sub` | *Subject*: `username` del usuario autenticado (`Authentication.getName()`). |
| `iat` | *Issued At*: fecha de emisión del token (epoch, segundos). |
| `exp` | *Expiration*: fecha de expiración (`iat` + `jwt.expiration-ms`). |

**Signature:** `HMACSHA256(base64UrlEncode(header) + "." + base64UrlEncode(payload), jwt.secret)`,
verificada en cada petición por `JwtTokenProvider.validateToken(token)`.

### 3.2 Flujo de Autenticación y Uso

```
┌──────────┐   1. POST /api/auth/login    ┌──────────────────────────┐
│  Cliente │ ────────────────────────────►│      AuthController      │
│(frontend)│   { username, password }     └──────────────┬───────────┘
│          │                                              │
│          │                              2. AuthenticationManager
│          │                                 valida contra Usuario/BCrypt
│          │                                              │
│          │   3. JwtTokenProvider.generateToken()        ▼
│          │◄──────────────────────────── { token, userId, username, rol }
│          │
│          │   4. Guarda el token (localStorage) y lo reenvía
│          │      en cada petición protegida:
│          │      Authorization: Bearer <token>
│          │
│          │   5. GET /api/bodegas                        ┌─────────────────────┐
│          │ ────────────────────────────────────────────►│ JwtAuthenticationFilter│
│          │      Authorization: Bearer <token>            └──────────┬──────────┘
│          │                                                          │ token valido
│          │                                                          ▼
│          │◄──────────────────────────────────────── 200 OK + JSON  Controller
└──────────┘
```

### 3.3 Ejemplo con `curl`

**1. Login:**

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

**Respuesta:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsImlhdCI6MTc1MzQ0MDAwMCwiZXhwIjoxNzUzNTI2NDAwfQ.4f2a9c7e1b3d6f8a0c5e2b9d7f1a3c6e8b0d2f4a6c8e0b2d4f6a8c0e2b4d6f8a",
  "tokenType": "Bearer",
  "userId": 1,
  "username": "admin",
  "email": "admin@logitrac.com",
  "rol": "ADMIN"
}
```

**2. Uso del token en un endpoint protegido:**

```bash
curl -X GET http://localhost:8080/api/auditorias \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsImlhdCI6MTc1MzQ0MDAwMCwiZXhwIjoxNzUzNTI2NDAwfQ.4f2a9c7e1b3d6f8a0c5e2b9d7f1a3c6e8b0d2f4a6c8e0b2d4f6a8c0e2b4d6f8a"
```

**3. Petición sin token (o token inválido/expirado) a una ruta protegida:**

```bash
curl -i http://localhost:8080/api/bodegas
```

```
HTTP/1.1 401 Unauthorized
```

**4. Petición con token válido pero rol insuficiente** (por ejemplo, un
`EMPLEADO` intentando eliminar una bodega):

```bash
curl -X DELETE http://localhost:8080/api/bodegas/1 \
  -H "Authorization: Bearer <token_de_un_EMPLEADO>"
```

```json
{
  "timestamp": "2025-01-15T10:30:00",
  "status": 403,
  "error": "Forbidden",
  "message": "Acceso denegado. No tiene permisos para realizar esta acción."
}
```

### 3.4 Consumo desde el Frontend (`js/api.js`)

```javascript
async function apiFetch(path, options = {}) {
  const token = getToken(); // localStorage
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(path, { ...options, headers });

  if (response.status === 401) {
    cerrarSesion(); // token expirado o inválido -> logout y redirect a /index.html
    throw new Error('Sesion expirada, inicia sesion de nuevo');
  }
  if (response.status === 403) {
    throw new Error('No tienes permisos para esta accion');
  }
  return response.status === 204 ? null : response.json();
}
```

Cada pantalla protegida llama primero a `protegerRuta()`, que redirige al
login si no hay token guardado, y `ajustarMenuSegunRol()` / `protegerRutaAdmin()`
ocultan o bloquean secciones según el `rol` (`ADMIN` / `EMPLEADO`) decodificado
del `AuthResponse` guardado en `localStorage`.

---


