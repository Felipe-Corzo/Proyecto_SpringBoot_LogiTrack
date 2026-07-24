package com.logitrack.listener;

import com.logitrack.model.TipoOperacion;

public class AuditoriaEvent {

    private final TipoOperacion tipoOperacion;
    private final String entidadAfectada;
    private final Long entidadId;
    private final String valoresAnteriores;
    private final String valoresNuevos;
    private final String username;

    public AuditoriaEvent(TipoOperacion tipoOperacion, String entidadAfectada, Long entidadId,
                           String valoresAnteriores, String valoresNuevos, String username) {
        this.tipoOperacion = tipoOperacion;
        this.entidadAfectada = entidadAfectada;
        this.entidadId = entidadId;
        this.valoresAnteriores = valoresAnteriores;
        this.valoresNuevos = valoresNuevos;
        this.username = username;
    }

    public TipoOperacion getTipoOperacion() { return tipoOperacion; }
    public String getEntidadAfectada() { return entidadAfectada; }
    public Long getEntidadId() { return entidadId; }
    public String getValoresAnteriores() { return valoresAnteriores; }
    public String getValoresNuevos() { return valoresNuevos; }
    public String getUsername() { return username; }
}