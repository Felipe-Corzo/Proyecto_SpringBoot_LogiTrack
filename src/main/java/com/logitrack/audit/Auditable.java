package com.logitrack.audit;

import java.util.Map;

/**
 * Contrato que implementan las entidades que queremos auditar
 * (Bodega, Producto, MovimientoInventario). No incluye Usuario
 * (por la password) ni Auditoria (se auditaria a si misma).
 */
public interface Auditable {

    /** Solo campos propios/escalares, sin relaciones perezosas completas
     *  (para relaciones, usar el id: ej. "encargadoId"). Debe ser
     *  serializable a JSON sin disparar lazy-loading adicional. */
    Map<String, Object> auditFields();

    /** El id de la fila (para la columna auditoria.entidad_id). */
    Object getAuditId();

    /** Snapshot en memoria (NO persistido, ver @Transient en la entidad)
     *  cargado la ultima vez que la entidad se leyo de la base de datos.
     *  Se usa para saber los "valores_anteriores" en un UPDATE. */
    String getAuditSnapshot();

    void setAuditSnapshot(String snapshot);

    default String getEntidadNombre() {
        return this.getClass().getSimpleName();
    }
}
